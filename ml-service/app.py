"""Chemistry ML service: RDKit + model sifat + pustaka PubChem.

Hanya dipanggil oleh API Node (bukan langsung oleh browser). Lihat README.
Jalankan: uvicorn app:app --port 5000
"""
import asyncio
import logging
import os
import threading
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from rdkit import Chem

from chem import analogs, groups, pubchem
from chem.depict import svg
from chem.descriptors import describe, formula
from chem.features import vector
from chem.library import Library, spread
from chem.predictor import Predictor
from chem.presets import PRESETS
from chem.properties import COMPUTED, TARGETS
from chem.scoring import score

# Baca ml-service/.env sederhana (KUNCI=nilai) tanpa paket tambahan.
_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env):
    for _line in open(_env, encoding="utf-8"):
        _k, _, _v = _line.strip().partition("=")
        if _k and not _k.startswith("#") and _k not in os.environ:
            os.environ[_k] = _v.strip()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("chemistry")

TOKEN = os.environ.get("ML_SERVICE_TOKEN", "")
if not TOKEN and os.environ.get("RENDER"):
    raise RuntimeError("ML_SERVICE_TOKEN wajib diisi: di Render layanan ini terbuka ke internet.")

_library: Optional[Library] = None
_lock = threading.Lock()


def lib() -> Library:
    """Pustaka dan model dimuat saat pertama dibutuhkan, bukan saat layanan menyala."""
    global _library
    if _library is None:
        with _lock:
            if _library is None:
                _library = Library(Predictor())
    return _library


app = FastAPI(title="Chemistry ML service", docs_url=None, redoc_url=None)


@app.middleware("http")
async def check_token(request: Request, call_next):
    # Layanan internal: hanya API yang memegang token ini yang boleh memanggil.
    if TOKEN and request.url.path != "/health" and request.headers.get("x-service-token") != TOKEN:
        return JSONResponse({"detail": "Tidak diizinkan."}, status_code=401)
    return await call_next(request)


@app.get("/health")
def health():
    # Tidak boleh memanggil lib(): pemeriksa kesehatan harus cepat dan hemat memori.
    return {"ok": True, "loaded": _library is not None}


@app.get("/meta")
def meta():
    counts = {k: int(lib().df[t["column"]].notna().sum()) for k, t in TARGETS.items()}
    return {
        "targets": {k: {"label": t["label"], "unit": t["unit"], "log": bool(t.get("log")), "experimental": counts[k], **lib().predictor.metrics.get(k, {})} for k, t in TARGETS.items()},
        "computed": COMPUTED,
        "groups": groups.labels(),
        "presets": PRESETS,
        "compounds": len(lib().df),
    }


def predict_one(smiles: str, desc: dict):
    X = vector(smiles, desc)[None, :]
    raw = lib().predictor.predict(X)
    props = {}
    for key, (v, _, sd) in raw.items():
        val = float(v[0])
        props[key] = {"value": val, "source": "prediksi", **spread(key, val, float(sd[0]))}
    for key in COMPUTED:
        props[key] = {"value": float(desc[key]), "source": "struktur"}
    return props


def compound_from_smiles(smiles: str):
    """Data lengkap satu struktur: dari pustaka bila ada (eksperimen), kalau tidak dihitung + diprediksi."""
    desc = describe(smiles, strict=False)
    if desc is None:
        raise HTTPException(400, "SMILES tidak valid atau berisi unsur yang tidak didukung (hanya senyawa organik: C, H, N, O, S, P, F, Cl, Br, I, Si, B).")
    i = lib().find(desc["smiles"])
    if i is not None:
        return {**lib().summary(i), "properties": lib().properties(i), "in_library": True}
    mol = Chem.MolFromSmiles(desc["smiles"])
    return {
        "cid": None,
        "name": "",
        "iupac": "",
        "formula": formula(desc["smiles"]),
        "smiles": desc["smiles"],
        "groups": groups.find(mol),
        "properties": predict_one(desc["smiles"], desc),
        "in_library": False,
        "synth_score": analogs.synth_score(desc["smiles"]),
    }


class AnalyzeReq(BaseModel):
    smiles: Optional[str] = None
    name: Optional[str] = None


@app.post("/analyze")
async def analyze(req: AnalyzeReq):
    await run_in_threadpool(lib)  # jangan menahan /health selama pemuatan
    smiles = (req.smiles or "").strip()
    if not smiles and req.name:
        hits = lib().search(req.name, 1)
        if hits and lib().df["name"].iloc[hits[0]].lower() == req.name.strip().lower():
            smiles = lib().df.smiles.iloc[hits[0]]
        else:
            found = await pubchem.by_name(req.name.strip())
            if not found or not found.get("smiles"):
                raise HTTPException(404, f'Senyawa "{req.name}" tidak ditemukan. Coba nama dalam bahasa Inggris atau SMILES.')
            smiles = found["smiles"]
    if not smiles:
        raise HTTPException(400, "Isi SMILES atau nama senyawa.")
    c = compound_from_smiles(smiles)
    c["similar"] = [{**lib().summary(i), "similarity": round(s, 3)} for i, s in lib().similar(c["smiles"], 6)]
    return c


@app.get("/compound/{cid}")
def compound(cid: int):
    i = lib().by_cid.get(cid)
    if i is None:
        raise HTTPException(404, "Senyawa tidak ada di pustaka.")
    c = {**lib().summary(i), "properties": lib().properties(i), "in_library": True}
    c["similar"] = [{**lib().summary(j), "similarity": round(s, 3)} for j, s in lib().similar(c["smiles"], 6)]
    return c


@app.get("/search")
async def search(q: str = Query(..., min_length=1, max_length=100)):
    await run_in_threadpool(lib)  # jangan menahan /health selama pemuatan
    idx = lib().search(q, 20)
    items = [{**lib().summary(i), "in_library": True} for i in idx]
    if not items:
        found = await pubchem.by_name(q)
        if found and found.get("smiles") and describe(found["smiles"], strict=False):
            items = [{**found, "in_library": False, "groups": []}]
    return {"items": items}


@app.get("/structure.svg")
def structure(smiles: str = Query(..., max_length=400), w: int = 320, h: int = 240, dark: bool = False):
    s = svg(smiles, min(max(w, 80), 1200), min(max(h, 60), 900), dark)
    if s is None:
        raise HTTPException(400, "SMILES tidak valid.")
    return Response(s, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})


class Criterion(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    weight: float = Field(1, ge=0.5, le=3)


class ExtraCandidate(BaseModel):
    smiles: str
    note: str = ""


class DiscoverReq(BaseModel):
    criteria: dict[str, Criterion]
    include_groups: list[str] = []
    exclude_groups: list[str] = []
    known_limit: int = Field(8, ge=1, le=30)
    novel_limit: int = Field(6, ge=0, le=20)
    extra: list[ExtraCandidate] = []  # usulan dari Gemini, divalidasi di sini
    check_pubchem: bool = True


ALLOWED_KEYS = set(TARGETS) | set(COMPUTED)


def _passes(group_list, inc, exc):
    g = set(group_list)
    return set(inc) <= g and not (set(exc) & g)


def _find_candidates(req: DiscoverReq, crit: dict):
    library, predictor = lib(), lib().predictor
    # 1) Senyawa yang sudah dikenal (pustaka PubChem)
    scored = []
    for i in range(len(library.df)):
        if not _passes(library.groups[i], req.include_groups, req.exclude_groups):
            continue
        props = library.properties(i, crit)
        s, detail = score(props, crit)
        if s > 0:
            scored.append((s, i, props, detail))
    # skor sama: dahulukan yang lebih banyak didukung data eksperimen
    n_exp = lambda p: sum(1 for k in crit if p.get(k, {}).get("source") == "eksperimen")
    scored.sort(key=lambda x: (-x[0], -n_exp(x[2])))
    known = [{**library.summary(i), "properties": library.properties(i), "score": s, "fit": d, "origin": "pustaka", "in_library": True} for s, i, _, d in scored[: req.known_limit]]

    # 2) Kandidat baru: turunan dari senyawa terbaik + usulan Gemini
    novel = []
    if req.novel_limit:
        cands = {}
        for s, i, _, _ in scored[:15]:
            parent = library.summary(i)
            for smi, rule in analogs.generate(parent["smiles"]):
                cands.setdefault(smi, {"origin": "turunan", "rule": rule, "parent": {"cid": parent["cid"], "name": parent["name"]}})
        for e in req.extra[:20]:
            d = describe(e.smiles, strict=True)
            if d:
                cands[d["smiles"]] = {"origin": "gemini", "rule": e.note[:300], "parent": None}
        rows = []
        for smi, info in cands.items():
            if library.find(smi) is not None:
                continue  # sudah ada di pustaka -> bukan kandidat baru
            d = describe(smi, strict=True)
            if d is None:
                continue
            g = groups.find(Chem.MolFromSmiles(smi))
            if not _passes(g, req.include_groups, req.exclude_groups):
                continue
            rows.append((smi, d, g, info))
        if rows:
            import numpy as np

            X = np.stack([vector(smi, d) for smi, d, _, _ in rows])
            raw = predictor.predict(X)
            results = []
            for n, (smi, d, g, info) in enumerate(rows):
                props = {k: {"value": float(v[n]), "source": "prediksi", **spread(k, float(v[n]), float(sd[n]))} for k, (v, _, sd) in raw.items()}
                props.update({k: {"value": float(d[k]), "source": "struktur"} for k in COMPUTED})
                s, detail = score(props, crit)
                sa = analogs.synth_score(smi)
                if sa is not None and sa > 6:  # terlalu sulit disintesis
                    continue
                results.append({"cid": None, "name": "", "iupac": "", "formula": formula(smi), "smiles": smi, "groups": g, "properties": props, "score": s, "fit": detail, "synth_score": sa, "in_library": False, **info})
            results.sort(key=lambda r: -r["score"])
            # variasi: maksimal 2 turunan dari induk yang sama dan 2 dari aturan yang sama
            per_parent, per_rule = {}, {}
            for r in results:
                key = (r.get("parent") or {}).get("cid") or r["smiles"]
                rule = r["rule"] if r["origin"] == "turunan" else r["smiles"]
                if per_parent.get(key, 0) >= 2 or per_rule.get(rule, 0) >= 2:
                    continue
                per_parent[key] = per_parent.get(key, 0) + 1
                per_rule[rule] = per_rule.get(rule, 0) + 1
                novel.append(r)
                if len(novel) >= req.novel_limit:
                    break
    # jumlah senyawa pustaka yang memenuhi SEMUA kriteria
    full = sum(1 for _, _, _, d in scored if all(v == 1 for v in d.values()))
    return known, novel, full


@app.post("/discover")
async def discover(req: DiscoverReq):
    crit = {k: v.model_dump() for k, v in req.criteria.items() if k in ALLOWED_KEYS and (v.min is not None or v.max is not None)}
    if not crit:
        raise HTTPException(400, "Isi minimal satu kriteria dengan batas bawah atau atas.")
    for k, c in crit.items():
        if c["min"] is not None and c["max"] is not None and c["min"] > c["max"]:
            raise HTTPException(400, f"Batas bawah {TARGETS.get(k, COMPUTED.get(k))['label']} lebih besar dari batas atas.")

    # Perhitungan berat di thread terpisah supaya /health tetap menjawab.
    known, novel, full = await run_in_threadpool(_find_candidates, req, crit)
    if req.check_pubchem and novel:
        async with httpx.AsyncClient(timeout=8, headers=pubchem.HEADERS) as client:
            keys = [Chem.MolToInchiKey(Chem.MolFromSmiles(r["smiles"])) for r in novel]
            found = await asyncio.gather(*(pubchem.cid_for_inchikey(client, k) for k in keys))
        for r, f in zip(novel, found):
            r["pubchem_cid"] = None if f in (None, "?") else f
            r["novelty"] = "belum_terdaftar" if f is None else ("tidak_dicek" if f == "?" else "terdaftar")
    return {"criteria": crit, "known": known, "novel": novel, "matched": full}

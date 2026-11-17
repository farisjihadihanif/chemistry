"""Gabungkan anotasi PubChem menjadi satu tabel senyawa + sifat eksperimen + deskriptor RDKit.

Pemakaian: python scripts/build_dataset.py --raw data/raw --out data/compounds.csv
"""
import argparse
import glob
import json
import statistics
import sys
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from chem import parse  # noqa: E402
from chem.descriptors import describe, ALLOWED_ELEMENTS  # noqa: E402

FIELDS = {
    "boiling_point": ("bp_c", lambda s, d: parse.parse_temperature(s, "bp")),
    "melting_point": ("mp_c", lambda s, d: parse.parse_temperature(s, "mp")),
    "flash_point": ("flash_c", lambda s, d: parse.parse_temperature(s, "fp")),
    "autoignition_temperature": ("autoignition_c", lambda s, d: parse.parse_temperature(s, "ait")),
    "density": ("density", lambda s, d: parse.parse_density(s)),
    "vapor_pressure": ("vapor_mmhg", lambda s, d: parse.parse_vapor_pressure(s)),
    "surface_tension": ("surface_tension", lambda s, d: parse.parse_surface_tension(s)),
    "viscosity": ("viscosity_mpas", lambda s, d: parse.parse_viscosity(s, d)),  # butuh densitas -> terakhir
}


def strings(a):
    for d in a.get("Data", []):
        v = d.get("Value", {})
        s = " ".join(x.get("String", "") for x in v.get("StringWithMarkup", []))
        if not s and "Number" in v:
            s = f"{v['Number'][0] if isinstance(v['Number'], list) else v['Number']} {v.get('Unit', '')}"
        if s:
            yield s


def collect(raw: Path):
    values = defaultdict(lambda: defaultdict(list))
    for slug, (col, fn) in FIELDS.items():
        for f in sorted(glob.glob(str(raw / f"{slug}_*.json"))):
            for a in json.load(open(f))["Annotations"]["Annotation"]:
                cids = a.get("LinkedRecords", {}).get("CID", [])
                if len(cids) != 1:  # anotasi untuk campuran / banyak senyawa dilewati
                    continue
                cid = cids[0]
                dens = statistics.median(values[cid]["density"]) if values[cid].get("density") else None
                for s in strings(a):
                    v = fn(s, dens)
                    if v is not None:
                        values[cid][col].append(v)
    rows = {}
    for cid, cols in values.items():
        rows[cid] = {c: statistics.median(v) for c, v in cols.items() if v}
    return rows


def pubchem_props(cids, cache: Path):
    props = "Title,IUPACName,MolecularFormula,MolecularWeight,SMILES,XLogP,TPSA"
    out = {}
    cache.mkdir(parents=True, exist_ok=True)
    cids = sorted(cids)
    for i in range(0, len(cids), 150):
        batch = cids[i : i + 150]
        f = cache / f"props_{batch[0]}_{batch[-1]}.json"
        if f.exists():
            data = json.loads(f.read_text())
        else:
            url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{','.join(map(str, batch))}/property/{props}/JSON"
            for t in range(4):
                try:
                    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Chemistry-dataset/1.0"}), timeout=120) as r:
                        data = json.load(r)
                    break
                except Exception:
                    if t == 3:
                        raise
                    time.sleep(3)
            f.write_text(json.dumps(data))
            time.sleep(0.25)
        for p in data["PropertyTable"]["Properties"]:
            out[p["CID"]] = p
        print(f"properti PubChem {min(i + 150, len(cids))}/{len(cids)}", flush=True)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="data/raw")
    ap.add_argument("--out", default="data/compounds.csv")
    args = ap.parse_args()
    raw = Path(args.raw)
    rows = collect(raw)
    print("senyawa dengan minimal satu sifat:", len(rows))
    props = pubchem_props(list(rows), raw / "props")
    records = []
    for cid, vals in rows.items():
        p = props.get(cid)
        if not p or not p.get("SMILES"):
            continue
        d = describe(p["SMILES"])
        if d is None:  # anorganik, garam/campuran, unsur di luar daftar, atau terlalu besar
            continue
        records.append({
            "cid": cid,
            "name": p.get("Title") or "",
            "iupac": p.get("IUPACName") or "",
            "formula": p.get("MolecularFormula"),
            "smiles": d["smiles"],
            **{k: d[k] for k in d if k != "smiles"},
            "xlogp_pubchem": p.get("XLogP"),
            **vals,
        })
    df = pd.DataFrame.from_records(records).sort_values("cid")
    # Buang titik didih yang mustahil pada 1 atm (biasanya diukur pada tekanan rendah tanpa keterangan):
    # di bawah titik lelehnya sendiri, atau molekul berat (> 250 g/mol) yang "mendidih" di bawah 100 °C.
    bad_bp = (df.bp_c < df.mp_c) | ((df.mw > 250) & (df.bp_c < 100))
    df.loc[bad_bp, "bp_c"] = None
    # Titik nyala selalu di bawah titik didih.
    df.loc[df.flash_c > df.bp_c, "flash_c"] = None
    print("titik didih dibuang (tidak masuk akal):", int(bad_bp.sum()))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    print(f"tersimpan {len(df)} senyawa -> {args.out}")
    print(df.notna().sum().to_string())

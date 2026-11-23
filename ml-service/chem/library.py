"""Pustaka senyawa (dataset PubChem) + prediksi model untuk sifat yang belum ada data eksperimennya."""
import hashlib
import logging
from pathlib import Path

import numpy as np
import pandas as pd
from rdkit import Chem, DataStructs

from . import groups
from .descriptors import mol_from_smiles
from .features import bit_fp, vector
from .properties import COMPUTED, TARGETS

ROOT = Path(__file__).resolve().parents[1]
log = logging.getLogger("chemistry")


GROUP_IDS = list(groups.GROUPS)


class Library:
    def __init__(self, predictor, csv: Path = ROOT / "data" / "compounds.csv"):
        self.df = pd.read_csv(csv).reset_index(drop=True)
        self.predictor = predictor
        self.by_smiles = {s: i for i, s in enumerate(self.df.smiles)}
        # Senyawa dari impor dataset lain bisa tanpa CID.
        self.by_cid = {int(c): i for i, c in enumerate(self.df.cid) if pd.notna(c)}
        self.columns = {k: self.df[t["column"]].tolist() for k, t in TARGETS.items()}
        self.columns.update({k: self.df[k].tolist() for k in COMPUTED})
        z = self._cache(csv)
        self.pred = {k: (z[f"{k}_v"], z[f"{k}_sd"]) for k in predictor.models}
        self.inchikeys = {k: i for i, k in enumerate(z["inchikeys"].tolist()) if k}
        self.groups = [[g for n, g in enumerate(GROUP_IDS) if mask >> n & 1] for mask in z["groups"].tolist()]
        self.fps = z["fps"]
        self.fp_bits = np.bitwise_count(self.fps).sum(1, dtype=np.int32)
        log.info("Pustaka: %d senyawa", len(self.df))

    def _cache(self, csv: Path):
        """Hasil hitung pustaka disimpan ke file; dihitung ulang bila model atau datanya berubah."""
        sig = hashlib.md5()
        for part in (self.predictor.file.read_bytes(), csv.read_bytes(), repr(groups.GROUPS).encode()):
            sig.update(part)
        cache = ROOT / "data" / f"predictions_{sig.hexdigest()[:10]}.npz"
        if cache.exists():
            with np.load(cache) as z:
                return {k: z[k] for k in z.files}
        log.info("Menyiapkan pustaka (sekali saja)...")
        out = {
            "inchikeys": np.array([_inchikey(s) for s in self.df.smiles]),
            "groups": np.array([_group_mask(s) for s in self.df.smiles], dtype=np.int64),
            "fps": np.stack([_packed_fp(bit_fp(s)) for s in self.df.smiles]),
        }
        raw = self.predictor.predict(np.stack([vector(s) for s in self.df.smiles]))
        for k, (v, _, sd) in raw.items():
            out[f"{k}_v"], out[f"{k}_sd"] = v, sd
        for old in (ROOT / "data").glob("predictions_*.npz"):
            old.unlink()
        np.savez_compressed(cache, **out)
        return out

    def properties(self, i: int, keys=None):
        """Sifat senyawa ke-i: eksperimen bila ada, kalau tidak hasil prediksi (dengan ±). keys=None: semua."""
        out = {}
        for key in TARGETS:
            if keys is not None and key not in keys:
                continue
            exp = self.columns[key][i]
            if exp == exp:  # bukan NaN
                out[key] = {"value": float(exp), "source": "eksperimen"}
            elif key in self.pred:
                v, sd = self.pred[key]
                out[key] = {"value": float(v[i]), "source": "prediksi", **spread(key, float(v[i]), float(sd[i]))}
        for key in COMPUTED:
            if keys is None or key in keys:
                out[key] = {"value": float(self.columns[key][i]), "source": "struktur"}
        return out

    def summary(self, i: int):
        row = self.df.iloc[i]
        return {
            "cid": int(row.cid) if pd.notna(row.cid) else None,
            "name": row["name"] if isinstance(row["name"], str) else "",
            "iupac": row.iupac if isinstance(row.iupac, str) else "",
            "formula": row.formula,
            "smiles": row.smiles,
            "groups": self.groups[i],
        }

    def find(self, smiles: str):
        mol = mol_from_smiles(smiles)
        if mol is None:
            return None
        return self.inchikeys.get(Chem.MolToInchiKey(mol))

    def similar(self, smiles: str, k=8, min_sim=0.3):
        fp = bit_fp(smiles)
        if fp is None:
            return []
        q = _packed_fp(fp)
        common = np.bitwise_count(self.fps & q).sum(1, dtype=np.int32)
        sims = common / np.maximum(self.fp_bits + int(np.bitwise_count(q).sum()) - common, 1)
        idx = np.argsort(-sims, kind="stable")[: k + 1]
        return [(int(i), float(sims[i])) for i in idx if sims[i] >= min_sim and sims[i] < 0.999][:k]

    def search(self, q: str, limit=20):
        q = q.strip().lower()
        if not q:
            return []
        names = self.df["name"].fillna("").str.lower()
        hit = names.str.contains(q, regex=False) | (self.df.formula.str.lower() == q)
        if q.isdigit():
            hit |= self.df.cid.fillna(-1) == int(q)
        idx = self.df.index[hit]
        # nama yang diawali kata kunci didahulukan, lalu nama terpendek
        order = sorted(idx, key=lambda i: (not names[i].startswith(q), len(names[i])))
        return order[:limit]


def _inchikey(smiles):
    mol = mol_from_smiles(smiles)
    return Chem.MolToInchiKey(mol) if mol is not None else ""


def _group_mask(smiles):
    mol = mol_from_smiles(smiles)
    return sum(1 << GROUP_IDS.index(g) for g in groups.find(mol)) if mol is not None else 0


def _packed_fp(fp):
    bits = np.zeros(2048, dtype=np.uint8)
    if fp is not None:
        DataStructs.ConvertToNumpyArray(fp, bits)
    return np.packbits(bits)


def spread(key: str, value: float, sd: float):
    """Rentang ±1 SD antar pohon model, dalam satuan asli."""
    if TARGETS[key].get("log"):
        lv = np.log10(max(value, 1e-12))
        return {"low": float(10 ** (lv - sd)), "high": float(10 ** (lv + sd))}
    return {"low": value - sd, "high": value + sd}

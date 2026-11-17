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
from .predictor import MODELS
from .properties import COMPUTED, TARGETS

ROOT = Path(__file__).resolve().parents[1]
log = logging.getLogger("chemistry")


class Library:
    def __init__(self, predictor, csv: Path = ROOT / "data" / "compounds.csv"):
        self.df = pd.read_csv(csv).reset_index(drop=True)
        self.predictor = predictor
        self.by_smiles = {s: i for i, s in enumerate(self.df.smiles)}
        self.by_cid = {int(c): i for i, c in enumerate(self.df.cid)}
        mols = [mol_from_smiles(s) for s in self.df.smiles]
        self.inchikeys = {Chem.MolToInchiKey(m): i for i, m in enumerate(mols) if m is not None}
        self.groups = [groups.find(m) for m in mols]
        self.fps = [bit_fp(s) for s in self.df.smiles]
        self._load_predictions()
        log.info("Pustaka: %d senyawa", len(self.df))

    def _load_predictions(self):
        # Prediksi seluruh pustaka disimpan ke file, dihitung ulang bila model berubah.
        sig = hashlib.md5(b"".join((MODELS / f"{k}.joblib").read_bytes()[:4096] for k in self.predictor.models)).hexdigest()[:10]
        cache = ROOT / "data" / f"predictions_{sig}.npz"
        if cache.exists():
            z = np.load(cache)
            self.pred = {k: (z[f"{k}_v"], z[f"{k}_sd"]) for k in self.predictor.models}
            return
        log.info("Menghitung prediksi untuk seluruh pustaka (sekali saja)...")
        X = np.stack([vector(s) for s in self.df.smiles])
        raw = self.predictor.predict(X)
        self.pred = {k: (v[0], v[2]) for k, v in raw.items()}
        for old in (ROOT / "data").glob("predictions_*.npz"):
            old.unlink()
        np.savez_compressed(cache, **{f"{k}_v": v for k, (v, _) in self.pred.items()}, **{f"{k}_sd": sd for k, (_, sd) in self.pred.items()})

    def properties(self, i: int):
        """Semua sifat senyawa ke-i: eksperimen bila ada, kalau tidak hasil prediksi (dengan ±)."""
        row = self.df.iloc[i]
        out = {}
        for key, t in TARGETS.items():
            exp = row.get(t["column"])
            if pd.notna(exp):
                out[key] = {"value": float(exp), "source": "eksperimen"}
            elif key in self.pred:
                v, sd = self.pred[key]
                out[key] = {"value": float(v[i]), "source": "prediksi", **spread(key, float(v[i]), float(sd[i]))}
        for key in COMPUTED:
            out[key] = {"value": float(row[key]), "source": "struktur"}
        return out

    def summary(self, i: int):
        row = self.df.iloc[i]
        return {
            "cid": int(row.cid),
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
        sims = np.array(DataStructs.BulkTanimotoSimilarity(fp, self.fps))
        idx = np.argsort(-sims)[: k + 1]
        return [(int(i), float(sims[i])) for i in idx if sims[i] >= min_sim and sims[i] < 0.999][:k]

    def search(self, q: str, limit=20):
        q = q.strip().lower()
        if not q:
            return []
        names = self.df["name"].fillna("").str.lower()
        hit = names.str.contains(q, regex=False) | (self.df.formula.str.lower() == q)
        if q.isdigit():
            hit |= self.df.cid == int(q)
        idx = self.df.index[hit]
        # nama yang diawali kata kunci didahulukan, lalu nama terpendek
        order = sorted(idx, key=lambda i: (not names[i].startswith(q), len(names[i])))
        return order[:limit]


def spread(key: str, value: float, sd: float):
    """Rentang ±1 SD antar pohon model, dalam satuan asli."""
    if TARGETS[key].get("log"):
        lv = np.log10(max(value, 1e-12))
        return {"low": float(10 ** (lv - sd)), "high": float(10 ** (lv + sd))}
    return {"low": value - sd, "high": value + sd}

"""Latih model Random Forest untuk memprediksi sifat senyawa dari strukturnya.

Setiap sifat punya model sendiri. Evaluasi: 5-fold cross validation (MAE, R²),
disimpan ke models/metrics.json supaya akurasinya bisa ditampilkan jujur di aplikasi.
Pemakaian: python scripts/train.py --data data/compounds.csv --out models
"""
import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_predict

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from chem.features import vector  # noqa: E402
from chem.properties import TARGETS  # noqa: E402
from pack import pack_all  # noqa: E402

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/compounds.csv")
    ap.add_argument("--out", default="models")
    ap.add_argument("--trees", type=int, default=200)
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(args.data)
    X_all = np.stack([vector(s) for s in df.smiles])
    metrics = {}
    for key, t in TARGETS.items():
        mask = df[t["column"]].notna().to_numpy()
        y = df.loc[mask, t["column"]].to_numpy(dtype=float)
        if t.get("log"):
            y = np.log10(np.clip(y, 1e-12, None))
        X = X_all[mask]
        model = RandomForestRegressor(n_estimators=args.trees, min_samples_leaf=2, max_features=0.33, n_jobs=-1, random_state=42)
        pred = cross_val_predict(model, X, y, cv=KFold(5, shuffle=True, random_state=42), n_jobs=1)
        mae = mean_absolute_error(y, pred)
        r2 = r2_score(y, pred)
        model.fit(X, y)
        joblib.dump(model, out / f"{key}.joblib", compress=3)
        metrics[key] = {"n": int(mask.sum()), "mae": round(float(mae), 3), "r2": round(float(r2), 3), "log": bool(t.get("log"))}
        print(key, metrics[key], flush=True)
    pack_all(out)
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))

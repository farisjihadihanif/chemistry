"""Memuat model Random Forest dan memprediksi sifat beserta rentang ketidakpastiannya."""
import json
import logging
import subprocess
import sys
from pathlib import Path

import joblib
import numpy as np

from .properties import TARGETS

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
log = logging.getLogger("chemistry")


class Predictor:
    def __init__(self, models_dir: Path = MODELS):
        if not (models_dir / "metrics.json").exists():
            log.warning("Model belum ada, melatih dari data/compounds.csv (sekitar 2-3 menit, hanya sekali)...")
            subprocess.run([sys.executable, str(ROOT / "scripts" / "train.py"), "--data", str(ROOT / "data" / "compounds.csv"), "--out", str(models_dir)], check=True)
        self.metrics = json.loads((models_dir / "metrics.json").read_text())
        self.models = {k: joblib.load(models_dir / f"{k}.joblib") for k in TARGETS if (models_dir / f"{k}.joblib").exists()}
        for m in self.models.values():
            m.n_jobs = 1

    def predict(self, X: np.ndarray):
        """X: (n, fitur). Mengembalikan {sifat: (nilai[n], sd[n])} dalam satuan asli."""
        out = {}
        for key, model in self.models.items():
            per_tree = np.stack([t.predict(X) for t in model.estimators_])
            mean, sd = per_tree.mean(0), per_tree.std(0)
            if TARGETS[key].get("log"):
                # rentang dihitung di skala log lalu dikembalikan
                out[key] = (10 ** mean, mean, sd)
            else:
                out[key] = (mean, None, sd)
        return out

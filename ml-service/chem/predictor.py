"""Memuat model (bentuk ringkas) dan memprediksi sifat beserta rentang ketidakpastiannya."""
import json
import logging
import subprocess
import sys
from pathlib import Path

import numpy as np

from .packed import PackedForest
from .properties import TARGETS

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
log = logging.getLogger("chemistry")


class Predictor:
    def __init__(self, models_dir: Path = MODELS):
        if not (models_dir / "metrics.json").exists():
            log.warning("Model belum ada, melatih dari data/compounds.csv (sekitar 2-3 menit, hanya sekali)...")
            subprocess.run([sys.executable, str(ROOT / "scripts" / "train.py"), "--data", str(ROOT / "data" / "compounds.csv"), "--out", str(models_dir)], check=True)
        self.file = models_dir / "packed.npz"
        if not self.file.exists():
            # Proses terpisah: scikit-learn dan model mentah tidak tertinggal di memori layanan.
            subprocess.run([sys.executable, str(ROOT / "scripts" / "pack.py"), str(models_dir)], check=True)
        self.metrics = json.loads((models_dir / "metrics.json").read_text())
        with np.load(self.file) as z:
            parts = ("feature", "value", "right", "roots")
            self.models = {k: PackedForest(**{n: z[f"{k}__{n}"] for n in parts}) for k in TARGETS if f"{k}__roots" in z}

    def predict(self, X: np.ndarray):
        """X: (n, fitur). Mengembalikan {sifat: (nilai[n], rata-rata log[n] | None, sd[n])} dalam satuan asli."""
        out = {}
        for key, model in self.models.items():
            mean, sd = model.mean_sd(X)
            if TARGETS[key].get("log"):
                # rentang dihitung di skala log lalu dikembalikan
                out[key] = (10 ** mean, mean, sd)
            else:
                out[key] = (mean, None, sd)
        return out

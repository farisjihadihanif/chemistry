"""Ringkas models/*.joblib menjadi models/packed.npz (dipakai layanan; hemat RAM).

Dipanggil otomatis oleh train.py. Pemakaian: python scripts/pack.py [folder models]
"""
import sys
from pathlib import Path

import joblib
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from chem.packed import pack  # noqa: E402
from chem.properties import TARGETS  # noqa: E402


def pack_all(models_dir: Path):
    arrays = {}
    for key in TARGETS:
        path = models_dir / f"{key}.joblib"
        if path.exists():
            arrays.update({f"{key}__{name}": a for name, a in pack(joblib.load(path)).items()})
    np.savez(models_dir / "packed.npz", **arrays)


if __name__ == "__main__":
    pack_all(Path(sys.argv[1] if len(sys.argv) > 1 else "models"))

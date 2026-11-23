"""Siapkan cache pustaka (prediksi, sidik jari, gugus) saat build supaya layanan cepat menyala."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from chem.library import Library  # noqa: E402
from chem.predictor import Predictor  # noqa: E402

if __name__ == "__main__":
    print(f"Siap: {len(Library(Predictor()).df)} senyawa")

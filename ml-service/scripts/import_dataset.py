"""Tambahkan data sifat dari CSV lain (mis. dataset Kaggle) ke pustaka data/compounds.csv.

Contoh:
  # file CSV yang sudah diunduh
  python scripts/import_dataset.py --file data/kaggle/bp.csv --smiles SMILES --kolom BP --sifat boiling_point --satuan K

  # langsung dari Kaggle (butuh kaggle.json, lihat README bagian "Menambah data dari Kaggle")
  python scripts/import_dataset.py --kaggle pemilik/nama-dataset --file nama_file.csv --smiles smiles --kolom mp --sifat melting_point --satuan C

Aturan penggabungan:
- Struktur dicocokkan lewat InChIKey (RDKit), jadi beda penulisan SMILES tetap dianggap senyawa yang sama.
- Nilai yang sudah ada TIDAK ditimpa, kecuali memakai --timpa.
- Senyawa baru ditambahkan bila lolos aturan pustaka (organik, unsur yang didukung, bukan campuran).
- Setelah impor, latih ulang model: python scripts/train.py  (lalu jalankan ulang ml-service)
"""
import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from rdkit import Chem

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from chem.descriptors import describe  # noqa: E402
from chem.properties import TARGETS  # noqa: E402

UNITS = {
    "C": lambda v: v, "K": lambda v: v - 273.15, "F": lambda v: (v - 32) * 5 / 9,
    "g/cm3": lambda v: v, "kg/m3": lambda v: v / 1000,
    "cP": lambda v: v, "mPa.s": lambda v: v, "Pa.s": lambda v: v * 1000,
    "mmHg": lambda v: v, "kPa": lambda v: v * 7.50062, "Pa": lambda v: v * 0.00750062, "atm": lambda v: v * 760,
    "log10_mmHg": lambda v: 10 ** v, "log10_cP": lambda v: 10 ** v,
    "mN/m": lambda v: v, "dyn/cm": lambda v: v,
}
LIMITS = {"boiling_point": (-200, 700), "melting_point": (-200, 500), "flash_point": (-100, 400), "autoignition": (100, 800), "density": (0.4, 3.5), "viscosity": (0.05, 1e6), "vapor_pressure": (1e-12, 1e5), "surface_tension": (5, 80)}


def download_kaggle(dataset: str, dest: Path):
    import importlib.util

    # kaggle 2.x lupa mencantumkan `six` sebagai dependensi, jadi dipasang sekalian.
    missing = [m for m in ("kaggle", "six") if importlib.util.find_spec(m) is None]
    if missing:
        subprocess.run([sys.executable, "-m", "pip", "install", *missing], check=True)
    dest.mkdir(parents=True, exist_ok=True)
    r = subprocess.run([sys.executable, "-m", "kaggle", "datasets", "download", "-d", dataset, "-p", str(dest), "--unzip"])
    if r.returncode != 0:
        sys.exit(
            f"Gagal mengunduh dataset '{dataset}'. Periksa: (1) nama ditulis pemilik/nama-dataset persis seperti di URL Kaggle, "
            "(2) token ada di ~/.kaggle/access_token, (3) dataset itu publik."
        )


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file", required=True, help="Nama/path file CSV")
    ap.add_argument("--kaggle", help="Slug dataset Kaggle (pemilik/nama) untuk diunduh dulu ke data/kaggle/")
    ap.add_argument("--smiles", required=True, help="Nama kolom SMILES")
    ap.add_argument("--kolom", required=True, help="Nama kolom nilai sifat")
    ap.add_argument("--sifat", required=True, choices=list(TARGETS), help="Sifat yang diisi")
    ap.add_argument("--satuan", required=True, choices=list(UNITS), help="Satuan nilai di file")
    ap.add_argument("--nama", help="Nama kolom nama senyawa (opsional)")
    ap.add_argument("--sep", default=",", help="Pemisah kolom (default koma)")
    ap.add_argument("--timpa", action="store_true", help="Timpa nilai yang sudah ada")
    ap.add_argument("--pustaka", default=str(ROOT / "data" / "compounds.csv"))
    args = ap.parse_args()

    path = Path(args.file)
    if args.kaggle:
        dest = ROOT / "data" / "kaggle" / args.kaggle.replace("/", "__")
        download_kaggle(args.kaggle, dest)
        matches = list(dest.rglob(path.name))
        if not matches:
            sys.exit(f"File {path.name} tidak ada di dataset. Isi folder: {[p.name for p in dest.rglob('*') if p.is_file()]}")
        path = matches[0]
    src = pd.read_csv(path, sep=args.sep, low_memory=False)
    for col in [args.smiles, args.kolom] + ([args.nama] if args.nama else []):
        if col not in src.columns:
            sys.exit(f'Kolom "{col}" tidak ada. Kolom yang tersedia: {list(src.columns)}')

    lib = pd.read_csv(args.pustaka)
    col = TARGETS[args.sifat]["column"]
    keys = {}
    for i, s in enumerate(lib.smiles):
        m = Chem.MolFromSmiles(s)
        if m is not None:
            keys[Chem.MolToInchiKey(m)] = i
    conv, (lo, hi) = UNITS[args.satuan], LIMITS[args.sifat]
    vals = {}
    names = {}
    skipped = 0
    for _, r in src.iterrows():
        try:
            v = conv(float(str(r[args.kolom]).replace(",", ".")))
        except (TypeError, ValueError):
            skipped += 1
            continue
        d = describe(str(r[args.smiles]), strict=True)
        if d is None or not (lo <= v <= hi):
            skipped += 1
            continue
        k = Chem.MolToInchiKey(Chem.MolFromSmiles(d["smiles"]))
        vals.setdefault(k, (d, []))[1].append(v)
        if args.nama and isinstance(r[args.nama], str):
            names.setdefault(k, r[args.nama])

    filled = replaced = added = 0
    new_rows = []
    for k, (d, vs) in vals.items():
        v = float(np.median(vs))
        if k in keys:
            i = keys[k]
            if names.get(k) and not (isinstance(lib.at[i, "name"], str) and lib.at[i, "name"].strip()):
                lib.at[i, "name"] = names[k]
            if pd.isna(lib.at[i, col]):
                lib.at[i, col] = v
                filled += 1
            elif args.timpa:
                lib.at[i, col] = v
                replaced += 1
        else:
            new_rows.append({"cid": None, "name": names.get(k, ""), "iupac": "", "formula": Chem.rdMolDescriptors.CalcMolFormula(Chem.MolFromSmiles(d["smiles"])), **d, col: v})
            added += 1
    if new_rows:
        lib = pd.concat([lib, pd.DataFrame(new_rows)], ignore_index=True)
    lib.to_csv(args.pustaka, index=False)
    print(f"Selesai: {filled} nilai kosong diisi, {replaced} ditimpa, {added} senyawa baru, {skipped} baris dilewati.")
    print(f"Jumlah data {args.sifat} sekarang: {int(lib[col].notna().sum())}. Latih ulang model: python scripts/train.py")


if __name__ == "__main__":
    from rdkit.Chem import rdMolDescriptors  # noqa: F401  (dipakai via Chem.rdMolDescriptors)

    main()

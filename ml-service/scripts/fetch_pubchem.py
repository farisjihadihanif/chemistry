"""Unduh anotasi sifat eksperimen dari PubChem PUG-View (data asli, bersumber HSDB, dll).

Hasil mentah disimpan per halaman di folder cache supaya bisa diulang tanpa mengunduh lagi.
Pemakaian: python scripts/fetch_pubchem.py --out data/raw
"""
import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

HEADINGS = [
    "Boiling Point",
    "Melting Point",
    "Flash Point",
    "Density",
    "Viscosity",
    "Autoignition Temperature",
    "Vapor Pressure",
    "Surface Tension",
]
BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/annotations/heading/JSON"


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Chemistry-dataset/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # PubChem kadang sibuk (503)
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def fetch(heading, out: Path):
    slug = heading.lower().replace(" ", "_")
    page, total = 1, 1
    while page <= total:
        f = out / f"{slug}_{page:03d}.json"
        if f.exists():
            data = json.loads(f.read_text())
        else:
            q = urllib.parse.urlencode({"heading": heading, "heading_type": "Compound", "page": page})
            data = get(f"{BASE}?{q}")
            f.write_text(json.dumps(data))
            time.sleep(0.25)  # batas PubChem: maks 5 permintaan/detik
        total = data["Annotations"].get("TotalPages", 1)
        print(f"{heading}: halaman {page}/{total}", flush=True)
        page += 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/raw")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for h in HEADINGS:
        fetch(h, out)

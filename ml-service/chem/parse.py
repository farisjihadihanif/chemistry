"""Mengubah teks sifat eksperimen PubChem (mis. "352 °F at 12 mmHg") menjadi angka bersatuan baku.

Prinsip: lebih baik membuang data yang meragukan daripada menyimpan angka yang salah.
Nilai berbentuk batas ("> 93 °C"), kondisi tekanan tidak standar, atau fase gas dilewati.
"""
import re

NUM = r"[-−–]?\d+(?:[.,]\d+)?(?:\s*[xX×]\s*10\s*\^?\s*[-−–]?\d+|[eE][-−–]?\d+)?"
RANGE = rf"({NUM})(?:\s*(?:-|–|to)\s*({NUM}))?"
CENSOR = re.compile(r"(>|<|≥|≤|greater than|less than|above|below|approx|about|ca\.|circa)", re.I)


def to_float(s: str) -> float:
    s = s.replace("−", "-").replace("–", "-").replace(",", ".").replace(" ", "")
    m = re.match(r"(-?\d+(?:\.\d+)?)[xX×]10\^?(-?\d+)", s)
    if m:
        return float(m.group(1)) * 10 ** int(m.group(2))
    return float(s)


def _range_value(m) -> float:
    a = to_float(m.group(1))
    if m.group(2):
        b = to_float(m.group(2))
        # "19 - 20" adalah rentang; "-5 - -3" juga. Ambil tengahnya.
        if b >= a:
            return (a + b) / 2
    return a


def _segments(text: str):
    text = text.replace("°", "°").replace("deg ", "°").replace("Deg ", "°")
    for seg in re.split(r";|\n", text):
        seg = seg.strip()
        if seg:
            yield seg


TEMP = re.compile(RANGE + r"\s*°?\s*(C|F|K)\b(?!\w)", re.I)


def _to_c(v: float, unit: str) -> float:
    unit = unit.upper()
    if unit == "F":
        return (v - 32) * 5 / 9
    if unit == "K":
        return v - 273.15
    return v


PRESSURE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:\[)?\s*(mm\s*hg|mmhg|torr|kpa|atm|bar)\b", re.I)


def _standard_pressure(seg: str) -> bool:
    """Titik didih hanya dipakai pada tekanan normal (760 mm Hg / 101 kPa / 1 atm) atau tanpa keterangan."""
    for m in PRESSURE.finditer(seg):
        v, u = float(m.group(1)), m.group(2).lower().replace(" ", "")
        mmhg = {"mmhg": v, "torr": v, "kpa": v * 7.50062, "atm": v * 760, "bar": v * 750.06}[u]
        if not 740 <= mmhg <= 780:
            return False
    return True


def parse_temperature(text: str, kind: str):
    """kind: bp | mp | fp | ait. Mengembalikan °C atau None."""
    limits = {"bp": (-200, 700), "mp": (-200, 500), "fp": (-100, 400), "ait": (100, 800)}[kind]
    for seg in _segments(text):
        if CENSOR.search(seg) or re.search(r"decompos|sublim", seg, re.I) and kind == "bp":
            continue
        if kind == "bp" and not _standard_pressure(seg):
            continue
        m = TEMP.search(seg)
        if not m:
            continue
        v = _to_c(_range_value(m), m.group(3))
        if limits[0] <= v <= limits[1]:
            return round(v, 2)
    return None


def _condition_temp_ok(seg: str, lo=15, hi=30) -> bool:
    m = re.search(r"(?:@|at)\s*" + RANGE + r"\s*°?\s*(C|F|K)\b", seg, re.I)
    if not m:
        return True
    t = _to_c(_range_value(m), m.group(3))
    return lo <= t <= hi


def parse_density(text: str):
    for seg in _segments(text):
        if CENSOR.search(seg) or re.search(r"g/l\b|vapou?r density|air\s*=\s*1|\(gas\)", seg, re.I):
            continue
        m = re.search(RANGE, seg.split("@")[0].split(" at ")[0].replace("Relative density (water = 1):", ""))
        if not m:
            continue
        v = _range_value(m)
        if re.search(r"kg/(m3|cu m|m³)", seg, re.I):
            v /= 1000
        if 0.4 <= v <= 3.5:
            return round(v, 4)
    return None


def parse_viscosity(text: str, density=None):
    """Viskositas dinamis dalam mPa·s (= cP) pada 15–30 °C."""
    for seg in _segments(text):
        if CENSOR.search(seg) or re.search(r"\(gas\)|vapou?r", seg, re.I) or not _condition_temp_ok(seg):
            continue
        m = re.search(RANGE + r"\s*(cP|centipoise|mPa[\s.·\-]*s(?:ec)?|Pa[\s.·\-]*s(?:ec)?|mm²/s|mm2/s|sq mm/s|cSt|centistokes?)", seg, re.I)
        if not m:
            continue
        v = _range_value(m)
        u = m.group(3).lower()
        if u.startswith("pa"):
            v *= 1000
        elif u.startswith(("mm", "sq", "cst", "centistoke")):
            if not density:
                continue
            v *= density  # kinematik -> dinamis
        if 0.05 <= v <= 1e6:
            return round(v, 4)
    return None


def parse_vapor_pressure(text: str):
    """Tekanan uap dalam mm Hg pada 20–25 °C (atau tanpa keterangan suhu)."""
    for seg in _segments(text):
        if CENSOR.search(seg) or not _condition_temp_ok(seg, 18, 27):
            continue
        s = seg.replace("Vapor pressure,", "").replace("Vapor pressure:", "")
        unit_first = re.search(r"\b(kPa|Pa)\b\s*at[^:]*:\s*(" + NUM + ")", s)
        if unit_first:
            v = to_float(unit_first.group(2))
            v *= 7.50062 if unit_first.group(1) == "kPa" else 0.00750062
        else:
            m = re.search(r"(" + NUM + r")\s*\[?\s*(mm\s*Hg|mmHg|torr|kPa|Pa|atm|bar)\b", s, re.I)
            if not m:
                continue
            v = to_float(m.group(1))
            u = m.group(2).lower().replace(" ", "")
            v *= {"mmhg": 1, "torr": 1, "kpa": 7.50062, "pa": 0.00750062, "atm": 760, "bar": 750.06}[u]
        if 0 < v < 1e5:
            return v
    return None


def parse_surface_tension(text: str):
    for seg in _segments(text):
        if CENSOR.search(seg) or not _condition_temp_ok(seg):
            continue
        m = re.search(RANGE + r"\s*(dyn(?:es)?\s*/\s*cm|mN\s*/\s*m)", seg, re.I)
        if m:
            v = _range_value(m)
            if 5 <= v <= 80:
                return round(v, 2)
    return None

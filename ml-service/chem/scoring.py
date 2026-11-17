"""Menilai seberapa cocok sifat sebuah senyawa dengan kriteria pengguna (0-100)."""
import math

from .properties import TARGETS

# Toleransi: seberapa jauh di luar rentang masih diberi nilai sebagian.
TOLERANCE = {
    "boiling_point": 30, "melting_point": 20, "flash_point": 20, "autoignition": 50,
    "density": 0.1, "viscosity": 0.5, "vapor_pressure": 1.0, "surface_tension": 5,
    "mw": 50, "logp": 1.0, "tpsa": 20, "hbd": 1, "hba": 1, "rot_bonds": 2,
}


def _scale(key, v):
    return math.log10(max(v, 1e-12)) if TARGETS.get(key, {}).get("log") else v


def fit(key: str, prop: dict, crit: dict):
    """Kecocokan satu kriteria (0..1). crit: {min, max}."""
    if prop is None:
        return 0.0
    v = _scale(key, prop["value"])
    lo = _scale(key, crit["min"]) if crit.get("min") is not None else -math.inf
    hi = _scale(key, crit["max"]) if crit.get("max") is not None else math.inf
    if lo <= v <= hi:
        return 1.0
    dist = lo - v if v < lo else v - hi
    width = hi - lo if math.isfinite(hi - lo) else 0
    tol = max(TOLERANCE.get(key, 1), width * 0.5)
    return max(0.0, 1 - dist / tol)


def score(props: dict, criteria: dict):
    """criteria: {sifat: {min, max, weight}}. Mengembalikan (skor 0-100, rincian per kriteria)."""
    if not criteria:
        return 0.0, {}
    detail, total, wsum = {}, 0.0, 0.0
    for key, c in criteria.items():
        w = float(c.get("weight") or 1)
        f = fit(key, props.get(key), c)
        detail[key] = round(f, 3)
        total += w * f
        wsum += w
    s = total / wsum
    if any(v == 0 for v in detail.values()):
        s *= 0.6  # ada kriteria yang sama sekali tidak terpenuhi
    # Nilai prediksi kurang pasti dibanding eksperimen: kurangi sedikit.
    pred = [k for k in criteria if props.get(k, {}).get("source") == "prediksi"]
    s *= 1 - 0.08 * (len(pred) / len(criteria))
    return round(100 * s, 1), detail

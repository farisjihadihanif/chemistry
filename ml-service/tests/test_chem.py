"""Tes layanan ML. Jalankan: python -m pytest tests -q"""
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from chem import parse
from chem.analogs import generate
from chem.packed import PackedForest, pack
from chem.scoring import fit, score

ROOT = Path(__file__).resolve().parents[1]


def test_parse_temperatures():
    assert parse.parse_temperature("352 °F at 12 mmHg (NTP, 1992)", "bp") is None  # tekanan rendah
    assert parse.parse_temperature("295.9 °C @ 760 mm Hg", "bp") == 295.9
    assert parse.parse_temperature("240-242 °C", "bp") == 241.0
    assert parse.parse_temperature("greater than 212 °F", "fp") is None
    assert parse.parse_temperature("354 °F (179 °C) (closed cup)", "fp") == pytest.approx(178.89, abs=0.01)


def test_parse_viscosity_units():
    assert parse.parse_viscosity("3.8X10-2 Pa.s @ 25 °C") == pytest.approx(38.0)
    assert parse.parse_viscosity("0.39 mm²/s at 25 °C", density=0.8) == pytest.approx(0.312)
    assert parse.parse_viscosity("0.39 mm²/s at 25 °C") is None  # tanpa densitas tidak bisa dikonversi
    assert parse.parse_viscosity("0.0188 cP at 25 °C (gas)") is None


def test_scoring():
    assert fit("boiling_point", {"value": 100}, {"min": 60, "max": 160}) == 1
    assert 0 < fit("boiling_point", {"value": 170}, {"min": 60, "max": 160}) < 1
    assert fit("boiling_point", {"value": 400}, {"min": 60, "max": 160}) == 0
    s, d = score({"boiling_point": {"value": 100, "source": "eksperimen"}}, {"boiling_point": {"min": 60, "max": 160}})
    assert s == 100 and d == {"boiling_point": 1}


def test_analogs_are_valid_and_new():
    out = generate("CCCCO")
    smiles = [s for s, _ in out]
    assert "CCCCCO" in smiles  # rantai diperpanjang
    assert "CCCCO" not in smiles


def test_health_does_not_load_models():
    code = (
        "import sys, app; from fastapi.testclient import TestClient as C; "
        "r = C(app.app).get('/health').json(); assert r == {'ok': True, 'loaded': False}, r; "
        "assert 'sklearn' not in sys.modules"
    )
    subprocess.run([sys.executable, "-c", code], check=True, cwd=ROOT)


def test_render_requires_token():
    env = {**os.environ, "RENDER": "true", "ML_SERVICE_TOKEN": ""}
    r = subprocess.run([sys.executable, "-c", "import app"], cwd=ROOT, env=env, capture_output=True, text=True)
    assert r.returncode != 0 and "ML_SERVICE_TOKEN" in r.stderr


def test_packed_forest_matches_sklearn():
    from sklearn.ensemble import RandomForestRegressor

    rng = np.random.default_rng(0)
    X = rng.integers(0, 9, (400, 12)).astype(np.float32)
    X[:, :4] += rng.random((400, 4), dtype=np.float32)
    model = RandomForestRegressor(n_estimators=20, min_samples_leaf=2, random_state=1).fit(X, X @ rng.random(12))
    mean, sd = PackedForest(**pack(model)).mean_sd(X)
    per_tree = np.stack([t.predict(X) for t in model.estimators_])
    np.testing.assert_allclose(mean, per_tree.mean(0), rtol=1e-6)
    np.testing.assert_allclose(sd, per_tree.std(0), rtol=1e-4)


@pytest.fixture(scope="module")
def client():
    import app

    return TestClient(app.app)


def test_discover_returns_known_and_novel(client):
    r = client.post("/discover", json={"criteria": {"boiling_point": {"min": 60, "max": 160, "weight": 2}, "melting_point": {"max": 0}}, "exclude_groups": ["halogen"], "known_limit": 5, "novel_limit": 4, "check_pubchem": False})
    assert r.status_code == 200
    d = r.json()
    assert len(d["known"]) == 5 and d["matched"] > 0
    for c in d["known"]:
        assert "halogen" not in c["groups"]
        assert c["properties"]["boiling_point"]["source"] in ("eksperimen", "prediksi")
    assert d["novel"] and all(not c["in_library"] for c in d["novel"])


def test_discover_rejects_bad_range(client):
    assert client.post("/discover", json={"criteria": {"boiling_point": {"min": 200, "max": 100}}}).status_code == 400
    assert client.post("/discover", json={"criteria": {}}).status_code == 400


def test_analyze_known_and_unknown(client):
    eth = client.post("/analyze", json={"smiles": "OCC"}).json()
    assert eth["name"] == "Ethanol" and eth["properties"]["boiling_point"]["source"] == "eksperimen"
    new = client.post("/analyze", json={"smiles": "CCCCCCCCCCCCCCOCCOCC"}).json()
    assert new["in_library"] is False and new["properties"]["boiling_point"]["source"] == "prediksi"
    assert client.post("/analyze", json={"smiles": "[Na+].[Cl-]"}).status_code == 400
    assert client.get("/structure.svg", params={"smiles": "CCO"}).text.startswith("<svg")

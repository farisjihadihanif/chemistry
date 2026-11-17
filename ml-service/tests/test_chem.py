"""Tes layanan ML. Jalankan: python -m pytest tests -q"""
import pytest
from fastapi.testclient import TestClient

from chem import parse
from chem.analogs import generate
from chem.scoring import fit, score


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

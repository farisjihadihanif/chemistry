"""Pemanggilan PubChem secara langsung (cari nama, cek apakah senyawa sudah terdaftar)."""
import urllib.parse

import httpx

BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
HEADERS = {"User-Agent": "Chemistry/1.0"}


async def by_name(name: str):
    url = f"{BASE}/compound/name/{urllib.parse.quote(name)}/property/Title,SMILES,MolecularFormula/JSON"
    try:
        async with httpx.AsyncClient(timeout=10, headers=HEADERS) as c:
            r = await c.get(url)
        if r.status_code != 200:
            return None
        p = r.json()["PropertyTable"]["Properties"][0]
        return {"cid": p["CID"], "name": p.get("Title", name), "smiles": p.get("SMILES"), "formula": p.get("MolecularFormula")}
    except Exception:
        return None


async def cid_for_inchikey(client: httpx.AsyncClient, key: str):
    """None = belum terdaftar di PubChem, int = CID, "?" = tidak bisa dicek (jaringan)."""
    try:
        r = await client.get(f"{BASE}/compound/inchikey/{key}/cids/JSON")
        if r.status_code == 404:
            return None
        if r.status_code == 200:
            return r.json()["IdentifierList"]["CID"][0]
    except Exception:
        pass
    return "?"

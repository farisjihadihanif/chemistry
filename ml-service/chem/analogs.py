"""Membuat kandidat senyawa baru dari senyawa yang cocok, lewat modifikasi kimia sederhana.

Setiap aturan adalah transformasi yang lazim dipakai kimiawan saat "menyetel" sifat:
memperpanjang/memendekkan rantai, menambah cabang, mengganti gugus OH, menukar halogen, dsb.
"""
import os
import sys

from rdkit import Chem
from rdkit.Chem import AllChem, RDConfig

from .descriptors import ALLOWED_ELEMENTS, MAX_HEAVY_ATOMS

sys.path.append(os.path.join(RDConfig.RDContribDir, "SA_Score"))
import sascorer  # noqa: E402

RULES = [
    ("Rantai diperpanjang satu karbon", "[CH3;X4:1]>>[CH2:1]C"),
    ("Rantai diperpendek satu karbon", "[CH3;X4][CH2;X4:1][#6:2]>>[CH3:1][#6:2]"),
    ("Cabang metil ditambahkan", "[CH2;X4;!R:1]([#6:2])[#6:3]>>[CH:1](C)([#6:2])[#6:3]"),
    ("Gugus OH diubah jadi eter metil", "[CX4:1][OX2H1]>>[CX4:1]OC"),
    ("Gugus OH diubah jadi ester asetat", "[CX4:1][OX2H1]>>[CX4:1]OC(C)=O"),
    ("Ester metil diganti etil", "[CX3:1](=O)O[CH3]>>[CX3:1](=O)OCC"),
    ("Klorin diganti fluorin", "[#6:1]Cl>>[#6:1]F"),
    ("Bromin diganti klorin", "[#6:1]Br>>[#6:1]Cl"),
    ("Oksigen eter disisipkan ke rantai", "[CH2;X4;!R:1][CH2;X4;!R:2][CH2;X4;!R:3]>>[CH2:1]O[CH2:3]"),
    ("Cincin benzena diganti piridin", "[cH:1]1[cH:2][cH:3][cH:4][cH:5][c:6]1>>[cH:1]1[cH:2][n:3][cH:4][cH:5][c:6]1"),
    ("Ikatan rangkap dijenuhkan", "[CX3;!R:1]=[CX3;!R:2]>>[C:1][C:2]"),
    ("Gugus hidroksil ditambahkan di ujung rantai", "[CH3;X4:1][CH2;X4]>>[CH2:1](O)C"),
]
_RXNS = [(label, AllChem.ReactionFromSmarts(s)) for label, s in RULES]


def _ok(mol):
    try:
        Chem.SanitizeMol(mol)
    except Exception:
        return None
    if mol.GetNumHeavyAtoms() > MAX_HEAVY_ATOMS or len(Chem.GetMolFrags(mol)) > 1:
        return None
    if not {a.GetSymbol() for a in mol.GetAtoms()} <= ALLOWED_ELEMENTS:
        return None
    return mol


def generate(seed_smiles: str, max_per_rule=3):
    """Mengembalikan [(smiles, aturan)] turunan dari satu senyawa induk."""
    seed = Chem.MolFromSmiles(seed_smiles)
    if seed is None:
        return []
    out, seen = [], {Chem.MolToSmiles(seed)}
    for label, rxn in _RXNS:
        n = 0
        for prods in rxn.RunReactants((seed,)):
            m = _ok(Chem.Mol(prods[0]))
            if m is None:
                continue
            smi = Chem.MolToSmiles(m)
            if smi in seen:
                continue
            seen.add(smi)
            out.append((smi, label))
            n += 1
            if n >= max_per_rule:
                break
    return out


def synth_score(smiles: str):
    """Skor kemudahan sintesis (1 = mudah, 10 = sangat sulit), Ertl & Schuffenhauer 2009."""
    m = Chem.MolFromSmiles(smiles)
    return round(sascorer.calculateScore(m), 2) if m else None

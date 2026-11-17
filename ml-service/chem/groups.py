"""Gugus fungsi (SMARTS) untuk menandai dan menyaring senyawa."""
from rdkit import Chem

GROUPS = {
    "alkohol": ("Alkohol", "[CX4][OX2H]"),
    "fenol": ("Fenol", "c[OX2H]"),
    "eter": ("Eter", "[OD2]([#6;!$(C=O)])[#6;!$(C=O)]"),
    "aldehida": ("Aldehida", "[CX3H1](=O)[#6]"),
    "keton": ("Keton", "[#6][CX3](=O)[#6]"),
    "asam_karboksilat": ("Asam karboksilat", "[CX3](=O)[OX2H1]"),
    "ester": ("Ester", "[#6][CX3](=O)[OX2H0][#6]"),
    "amida": ("Amida", "[NX3][CX3](=[OX1])"),
    "amina": ("Amina", "[NX3;H2,H1,H0;!$(NC=O);!$(N-[a]);!$(N=*);!$(N#*)]"),
    "nitril": ("Nitril", "[NX1]#[CX2]"),
    "nitro": ("Nitro", "[$([NX3](=O)=O),$([NX3+](=O)[O-])]"),
    "halogen": ("Halogen", "[F,Cl,Br,I]"),
    "aromatik": ("Cincin aromatik", "a"),
    "alkena": ("Alkena", "[CX3]=[CX3]"),
    "alkuna": ("Alkuna", "[CX2]#[CX2]"),
    "tiol": ("Tiol", "[SX2H]"),
    "sulfida": ("Sulfida", "[#6][SX2][#6]"),
    "sulfon": ("Sulfon / sulfonat", "[SX4](=O)(=O)"),
    "fosfat": ("Fosfat / fosfonat", "[PX4](=O)"),
    "siloksan": ("Silana / siloksan", "[Si]"),
    "epoksida": ("Epoksida", "C1OC1"),
}
_PATTERNS = {k: Chem.MolFromSmarts(s) for k, (_, s) in GROUPS.items()}


def find(mol):
    return [k for k, p in _PATTERNS.items() if mol.HasSubstructMatch(p)]


def labels():
    return [{"id": k, "label": v[0]} for k, v in GROUPS.items()]

"""Deskriptor molekul dengan RDKit: dipakai untuk dataset, model, dan kalkulator sifat."""
from rdkit import Chem, RDLogger
from rdkit.Chem import Crippen, Descriptors, Lipinski, rdMolDescriptors
from rdkit.Chem.MolStandardize import rdMolStandardize

RDLogger.DisableLog("rdApp.*")

ALLOWED_ELEMENTS = {"C", "H", "N", "O", "S", "P", "F", "Cl", "Br", "I", "Si", "B"}
MAX_HEAVY_ATOMS = 60

# Urutan kolom fitur model (jangan diubah tanpa melatih ulang).
FEATURES = [
    "mw", "logp", "tpsa", "hbd", "hba", "rot_bonds", "heavy_atoms", "rings", "aromatic_rings",
    "frac_csp3", "n_halogen", "n_n", "n_o", "n_s", "n_p", "n_si", "mr", "labute_asa", "charge_abs",
]

_largest = rdMolStandardize.LargestFragmentChooser()


def mol_from_smiles(smiles: str):
    if not smiles or len(smiles) > 400:
        return None
    mol = Chem.MolFromSmiles(smiles)
    return mol


def describe(smiles: str, strict: bool = True):
    """Mengembalikan dict deskriptor, atau None kalau molekul tidak valid / di luar cakupan.

    strict=True (dataset): tolak campuran/garam & unsur di luar daftar.
    """
    mol = mol_from_smiles(smiles)
    if mol is None:
        return None
    if strict and len(Chem.GetMolFrags(mol)) > 1:
        return None
    if not strict:
        mol = _largest.choose(mol)
    elems = {a.GetSymbol() for a in mol.GetAtoms()}
    if not elems <= ALLOWED_ELEMENTS or "C" not in elems:
        return None
    heavy = mol.GetNumHeavyAtoms()
    if heavy < 2 and strict or heavy > MAX_HEAVY_ATOMS:
        return None
    count = lambda sym: sum(1 for a in mol.GetAtoms() if a.GetSymbol() == sym)
    return {
        "smiles": Chem.MolToSmiles(mol),
        "mw": round(Descriptors.MolWt(mol), 3),
        "logp": round(Crippen.MolLogP(mol), 3),
        "tpsa": round(rdMolDescriptors.CalcTPSA(mol), 2),
        "hbd": Lipinski.NumHDonors(mol),
        "hba": Lipinski.NumHAcceptors(mol),
        "rot_bonds": Lipinski.NumRotatableBonds(mol),
        "heavy_atoms": heavy,
        "rings": rdMolDescriptors.CalcNumRings(mol),
        "aromatic_rings": rdMolDescriptors.CalcNumAromaticRings(mol),
        "frac_csp3": round(rdMolDescriptors.CalcFractionCSP3(mol), 3),
        "n_halogen": sum(count(x) for x in ("F", "Cl", "Br", "I")),
        "n_n": count("N"),
        "n_o": count("O"),
        "n_s": count("S"),
        "n_p": count("P"),
        "n_si": count("Si"),
        "mr": round(Crippen.MolMR(mol), 3),
        "labute_asa": round(rdMolDescriptors.CalcLabuteASA(mol), 3),
        "charge_abs": sum(abs(a.GetFormalCharge()) for a in mol.GetAtoms()),
    }


def formula(smiles: str):
    mol = mol_from_smiles(smiles)
    return rdMolDescriptors.CalcMolFormula(mol) if mol else None

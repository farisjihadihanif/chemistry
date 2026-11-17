"""Vektor fitur untuk model: deskriptor RDKit + sidik jari Morgan (hitungan, 512 bit)."""
import numpy as np
from rdkit.Chem import rdFingerprintGenerator

from .descriptors import FEATURES, describe, mol_from_smiles

FP_BITS = 512
_gen = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=FP_BITS)
_bitgen = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=2048)


def vector(smiles: str, desc: dict | None = None):
    mol = mol_from_smiles(smiles)
    if mol is None:
        return None
    desc = desc or describe(smiles, strict=False)
    if desc is None:
        return None
    fp = np.asarray(_gen.GetCountFingerprintAsNumPy(mol), dtype=np.float32)
    return np.concatenate([np.array([desc[f] for f in FEATURES], dtype=np.float32), np.minimum(fp, 8)])


def bit_fp(smiles: str):
    """Sidik jari bit untuk kemiripan Tanimoto."""
    mol = mol_from_smiles(smiles)
    return _bitgen.GetFingerprint(mol) if mol is not None else None

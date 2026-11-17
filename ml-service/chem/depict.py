"""Gambar struktur 2D molekul sebagai SVG (tema terang/gelap)."""
from rdkit.Chem import rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D

from .descriptors import mol_from_smiles

rdDepictor.SetPreferCoordGen(True)


def svg(smiles: str, width=320, height=240, dark=False):
    mol = mol_from_smiles(smiles)
    if mol is None:
        return None
    rdDepictor.Compute2DCoords(mol)
    d = rdMolDraw2D.MolDraw2DSVG(width, height)
    o = d.drawOptions()
    o.clearBackground = False
    o.bondLineWidth = 1.6
    o.padding = 0.08
    o.addStereoAnnotation = False
    if dark:
        o.setBackgroundColour((0, 0, 0, 0))
        o.updateAtomPalette({6: (0.88, 0.9, 0.92), 1: (0.88, 0.9, 0.92), 7: (0.45, 0.65, 1.0), 8: (1.0, 0.45, 0.42), 16: (0.95, 0.8, 0.3)})
        o.setSymbolColour((0.88, 0.9, 0.92))
    d.DrawMolecule(mol)
    d.FinishDrawing()
    return d.GetDrawingText().replace("<?xml version='1.0' encoding='iso-8859-1'?>\n", "")

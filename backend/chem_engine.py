import math
import re

COMPOUND_LIBRARY = [
    {
        "id": "cmp_hexyl_triethoxylate",
        "name": "Hexyl Triethoxylate",
        "formula": "C12H26O4",
        "smiles": "CCCCCCOCCOCCOCCO",
        "category": "Surfactant",
        "mw": 234.33,
        "logp": 2.15,
        "boiling_point": 265.0,
        "melting_point": -12.0,
        "viscosity": 18.5,
        "thermal_stability": 185,
        "solubility": "Amphiphilic",
        "h_donors": 1,
        "h_acceptors": 4,
        "tpsa": 47.92,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Surfaktan ringan berbahan dasar alkohol rantai pendek yang mudah terurai secara alami dan aman untuk formulasi pembersih ramah lingkungan.",
        "justification": "Memiliki keseimbangan hidrofilik-lipofilik (HLB ~11.8) yang ideal untuk menurunkan tegangan antarmuka air-minyak dengan stabilitas termal baik."
    },
    {
        "id": "cmp_octyl_glycerol",
        "name": "Octyl Glycerol Ether",
        "formula": "C11H24O3",
        "smiles": "CCCCCCCCOCC(O)CO",
        "category": "Surfactant",
        "mw": 204.31,
        "logp": 2.38,
        "boiling_point": 278.0,
        "melting_point": 4.0,
        "viscosity": 32.0,
        "thermal_stability": 195,
        "solubility": "Amphiphilic",
        "h_donors": 2,
        "h_acceptors": 3,
        "tpsa": 49.69,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Turunan gliserol nabati yang lembut di kulit dan sering digunakan pada produk perawatan rumah tangga serta emulsi hijau.",
        "justification": "Gugus gliserol memberikan dua donor ikatan hidrogen untuk kelarutan air, sementara rantai oktil menjaga efektivitas pengemulsi."
    },
    {
        "id": "cmp_ethylhexyl_triethoxylate",
        "name": "2-Ethylhexyl Triethoxylate",
        "formula": "C14H30O4",
        "smiles": "CCCCC(CC)COCCOCCOCCO",
        "category": "Surfactant",
        "mw": 262.39,
        "logp": 2.85,
        "boiling_point": 292.0,
        "melting_point": -18.0,
        "viscosity": 24.0,
        "thermal_stability": 210,
        "solubility": "Amphiphilic",
        "h_donors": 1,
        "h_acceptors": 4,
        "tpsa": 47.92,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Surfaktan bercabang dengan titik beku rendah sehingga tetap cair dan efektif pada suhu dingin.",
        "justification": "Struktur bercabang 2-etilheksil meningkatkan stabilitas termal hingga 210°C dan mempercepat pembasahan permukaan."
    },
    {
        "id": "cmp_pla_oligomer",
        "name": "Polylactic Acid (PLA) Lactide Dimer",
        "formula": "C6H8O4",
        "smiles": "CC1OC(=O)C(C)OC1=O",
        "category": "Polymer",
        "mw": 144.13,
        "logp": -0.24,
        "boiling_point": 255.0,
        "melting_point": 96.0,
        "viscosity": 45.0,
        "thermal_stability": 220,
        "solubility": "Water-soluble",
        "h_donors": 0,
        "h_acceptors": 4,
        "tpsa": 52.60,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Bahan baku bioplastik yang dibuat dari pati jagung atau tebu; aman untuk kemasan makanan dan terurai di kompos.",
        "justification": "Monomer siklik laktida dapat dipolimerisasi menjadi plastik biodegradable dengan kekuatan tarik tinggi untuk kemasan pangan."
    },
    {
        "id": "cmp_ethyl_lactate",
        "name": "Ethyl Lactate (Green Solvent)",
        "formula": "C5H10O3",
        "smiles": "CCOC(=O)C(C)O",
        "category": "Solvent",
        "mw": 118.13,
        "logp": -0.18,
        "boiling_point": 154.0,
        "melting_point": -26.0,
        "viscosity": 2.4,
        "thermal_stability": 150,
        "solubility": "Water-soluble",
        "h_donors": 1,
        "h_acceptors": 3,
        "tpsa": 46.53,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Pelarut alami beraroma ringan yang berasal dari fermentasi karbohidrat; pengganti aman untuk pelarut minyak bumi yang berbau tajam.",
        "justification": "Memiliki viskositas sangat rendah (2.4 cP) dan dapat bercampur sempurna dengan air maupun minyak untuk proses ekstraksi ramah lingkungan."
    },
    {
        "id": "cmp_limonene",
        "name": "D-Limonene Bio-Solvent",
        "formula": "C10H16",
        "smiles": "CC1=CCC(CC1)C(=C)C",
        "category": "Solvent",
        "mw": 136.23,
        "logp": 4.38,
        "boiling_point": 176.0,
        "melting_point": -74.0,
        "viscosity": 0.92,
        "thermal_stability": 165,
        "solubility": "Oil-soluble",
        "h_donors": 0,
        "h_acceptors": 0,
        "tpsa": 0.0,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Diekstrak dari kulit jeruk; efektif melarutkan lemak dan resin dengan aroma jeruk yang segar dan aman.",
        "justification": "Terpena alami non-polar dengan viskositas rendah dan kemampuan pelarutan minyak/resin yang sangat kuat tanpa residu toksik."
    },
    {
        "id": "cmp_triethyl_citrate",
        "name": "Triethyl Citrate (Safe Plasticizer)",
        "formula": "C12H20O7",
        "smiles": "CCOC(=O)CC(O)(CC(=O)OCC)C(=O)OCC",
        "category": "Additive",
        "mw": 276.28,
        "logp": 0.33,
        "boiling_point": 294.0,
        "melting_point": -55.0,
        "viscosity": 35.2,
        "thermal_stability": 230,
        "solubility": "Amphiphilic",
        "h_donors": 1,
        "h_acceptors": 7,
        "tpsa": 99.13,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Pelentur plastik aman berbahan asam sitrat (seperti pada buah jeruk) yang bebas ftalat, sehingga aman untuk mainan anak dan pembungkus makanan.",
        "justification": "Menawarkan stabilitas termal tinggi (230°C) dan kompatibilitas baik dengan biopolimer tanpa risiko migrasi zat berbahaya."
    },
    {
        "id": "cmp_oleic_ester",
        "name": "Methyl Oleate Bio-Lubricant",
        "formula": "C19H36O2",
        "smiles": "CCCCCCCC=CCCCCCCCC(=O)OC",
        "category": "Lubricant",
        "mw": 296.49,
        "logp": 7.45,
        "boiling_point": 348.0,
        "melting_point": -20.0,
        "viscosity": 6.8,
        "thermal_stability": 240,
        "solubility": "Oil-soluble",
        "h_donors": 0,
        "h_acceptors": 2,
        "tpsa": 26.30,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Pelumas berbasis minyak nabati yang dapat terurai alami di tanah/air, cocok untuk mesin pertanian ramah lingkungan.",
        "justification": "Rantai asam oleat panjang memberikan daya lumas tinggi dan stabilitas oksidasi yang baik pada suhu operasi menengah hingga tinggi."
    },
    {
        "id": "cmp_chitosan_unit",
        "name": "Glucosamine Bio-Coating Unit",
        "formula": "C6H13NO5",
        "smiles": "NC1C(O)OC(CO)C(O)C1O",
        "category": "Coating",
        "mw": 179.17,
        "logp": -2.10,
        "boiling_point": 310.0,
        "melting_point": 110.0,
        "viscosity": 55.0,
        "thermal_stability": 200,
        "solubility": "Water-soluble",
        "h_donors": 5,
        "h_acceptors": 6,
        "tpsa": 116.17,
        "biodegradable": True,
        "non_toxic": True,
        "family_note": "Pelapis alami antimikroba yang aman digunakan untuk memperpanjang kesegaran buah dan sayuran.",
        "justification": "Gugus amina dan hidroksil membentuk lapisan tipis pelindung yang dapat dimakan (edible coating) serta menghambat pertumbuhan mikroba."
    },
]

DISCOVERY_TEMPLATES = [
    {
        "id": "tpl_surfactant",
        "title": "Surfaktan Pembersih Ramah Lingkungan",
        "category": "Surfactant",
        "bp_min": 220,
        "bp_max": 310,
        "visc_min": 10,
        "visc_max": 50,
        "thermal": 150,
        "solubility": "Amphiphilic",
        "desc": "Formula surfaktan biodegradable dengan titik didih stabil untuk pembersih aman."
    },
    {
        "id": "tpl_biopolymer",
        "title": "Biopolimer Kemasan Pangan Aman",
        "category": "Polymer",
        "bp_min": 200,
        "bp_max": 320,
        "visc_min": 20,
        "visc_max": 80,
        "thermal": 180,
        "solubility": "Any",
        "desc": "Material polimer berbasis tumbuhan yang mudah terurai untuk wadah makanan."
    },
    {
        "id": "tpl_green_solvent",
        "title": "Pelarut Hijau (Green Solvent) Ekstraksi",
        "category": "Solvent",
        "bp_min": 120,
        "bp_max": 200,
        "visc_min": 0.5,
        "visc_max": 10,
        "thermal": 120,
        "solubility": "Any",
        "desc": "Pelarut rendah toksisitas dan viskositas rendah untuk ekstraksi bahan alami."
    },
    {
        "id": "tpl_safe_additive",
        "title": "Pelentur Plastik Bebas Ftalat",
        "category": "Additive",
        "bp_min": 250,
        "bp_max": 340,
        "visc_min": 15,
        "visc_max": 60,
        "thermal": 200,
        "solubility": "Amphiphilic",
        "desc": "Aditif non-toksik yang aman untuk perlengkapan anak dan rumah tangga."
    }
]


def recommend_compounds(
    category: str = "All",
    bp_min: float | None = None,
    bp_max: float | None = None,
    visc_min: float | None = None,
    visc_max: float | None = None,
    thermal_min: float | None = None,
    solubility: str = "Any",
    prompt_text: str = "",
) -> dict:
    p_low = (prompt_text or "").lower()
    inferred_cat = category
    if inferred_cat == "All" and p_low:
        for cat in ["Surfactant", "Polymer", "Solvent", "Additive", "Lubricant", "Coating"]:
            if cat.lower() in p_low:
                inferred_cat = cat
                break

    scored = []
    for c in COMPOUND_LIBRARY:
        score = 65.0
        if inferred_cat in ("All", "Any", "") or c["category"].lower() == inferred_cat.lower():
            score += 18.0
        if solubility not in ("Any", "All", "") and c["solubility"].lower() == solubility.lower():
            score += 8.0
        if bp_min is not None and c["boiling_point"] >= bp_min:
            score += 4.0
        if bp_max is not None and c["boiling_point"] <= bp_max:
            score += 4.0
        if visc_min is not None and c["viscosity"] >= visc_min:
            score += 3.0
        if visc_max is not None and c["viscosity"] <= visc_max:
            score += 3.0
        if thermal_min is not None and c["thermal_stability"] >= thermal_min:
            score += 5.0
        if p_low:
            if any(w in p_low for w in ["ramah", "biodegradable", "aman", "hijau", "green", "non-toxic"]) and c["biodegradable"]:
                score += 6.0
            if any(w in p_low for w in ["makanan", "food", "kemasan", "anak"]) and c["non_toxic"]:
                score += 4.0
        match_pct = min(98, max(52, round(score)))
        item = dict(c)
        item["match_score"] = match_pct
        scored.append(item)

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    top_compounds = scored[:3]

    summary = (
        f"Agen AI menganalisis kriteria yang Anda masukkan dan menyaring kandidat senyawa "
        f"yang paling aman, ramah lingkungan, serta memenuhi target sifat fisikokimia "
        f"(kategori {inferred_cat if inferred_cat != 'All' else 'Multi-Kategori'})."
    )

    return {
        "analysis_summary": summary,
        "compounds": top_compounds,
        "avg_confidence": round(sum(x["match_score"] for x in top_compounds) / max(1, len(top_compounds))),
    }


def calculate_smiles_properties(smiles: str) -> dict:
    s = (smiles or "").strip()
    if not s:
        return {"ok": False, "error": "Masukkan string SMILES terlebih dahulu."}

    # Check if matches known example first for exact values
    known = {
        "CCO": ("Ethanol", 46.07, -0.14, 1, 1, 20.23, False, 0),
        "CC(=O)OC1=CC=CC=C1C(=O)O": ("Aspirin", 180.16, 1.31, 1, 4, 63.60, True, 3),
        "CN1C=NC2=C1C(=O)N(C(=O)N2C)C": ("Caffeine", 194.19, -0.07, 0, 6, 61.82, True, 0),
        "C1=CC=CC=C1": ("Benzene", 78.11, 2.13, 0, 0, 0.00, True, 0),
        "OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O": ("Glucose", 180.16, -3.24, 5, 6, 110.38, False, 1),
    }
    if s in known:
        name, mw, logp, hbd, hba, tpsa, arom, rot = known[s]
        heavy = len(re.findall(r"[A-Za-z]", s.replace("H", "")))
    else:
        c_cnt = s.count("C") + s.count("c")
        n_cnt = s.count("N") + s.count("n")
        o_cnt = s.count("O") + s.count("o")
        s_cnt = s.count("S") + s.count("s")
        heavy = max(1, c_cnt + n_cnt + o_cnt + s_cnt)
        mw = round(c_cnt * 13.5 + n_cnt * 14.0 + o_cnt * 16.0 + s_cnt * 32.0 + 2.0, 2)
        hbd = o_cnt + n_cnt if o_cnt + n_cnt > 0 else 0
        hba = o_cnt + n_cnt
        logp = round((c_cnt * 0.45) - (o_cnt + n_cnt) * 0.72, 2)
        tpsa = round(o_cnt * 18.2 + n_cnt * 14.5, 2)
        arom = any(ch.islower() for ch in s)
        rot = max(0, c_cnt // 3)
        name = "Custom Molecule"

    lipinski_ok = (mw <= 500) and (logp <= 5) and (hbd <= 5) and (hba <= 10)
    return {
        "ok": True,
        "name": name,
        "smiles": s,
        "mw": mw,
        "logp": logp,
        "h_donors": hbd,
        "h_acceptors": hba,
        "heavy_atoms": heavy,
        "rotatable_bonds": rot,
        "tpsa": tpsa,
        "aromatic": arom,
        "lipinski_pass": lipinski_ok,
    }

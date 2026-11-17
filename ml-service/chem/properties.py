"""Daftar sifat yang didukung: kolom dataset, satuan, label, dan apakah dimodelkan dalam log10."""

TARGETS = {
    "boiling_point": {"column": "bp_c", "unit": "°C", "label": "Titik didih"},
    "melting_point": {"column": "mp_c", "unit": "°C", "label": "Titik leleh"},
    "flash_point": {"column": "flash_c", "unit": "°C", "label": "Titik nyala"},
    "autoignition": {"column": "autoignition_c", "unit": "°C", "label": "Suhu penyalaan sendiri"},
    "density": {"column": "density", "unit": "g/cm³", "label": "Densitas"},
    "viscosity": {"column": "viscosity_mpas", "unit": "mPa·s", "label": "Viskositas", "log": True},
    "vapor_pressure": {"column": "vapor_mmhg", "unit": "mmHg", "label": "Tekanan uap (25 °C)", "log": True},
    "surface_tension": {"column": "surface_tension", "unit": "mN/m", "label": "Tegangan permukaan"},
}

# Sifat yang dihitung langsung dari struktur (bukan prediksi model).
COMPUTED = {
    "mw": {"unit": "g/mol", "label": "Massa molekul"},
    "logp": {"unit": "", "label": "LogP (lipofilisitas)"},
    "tpsa": {"unit": "Å²", "label": "TPSA"},
    "hbd": {"unit": "", "label": "Donor ikatan H"},
    "hba": {"unit": "", "label": "Akseptor ikatan H"},
    "rot_bonds": {"unit": "", "label": "Ikatan dapat berotasi"},
}

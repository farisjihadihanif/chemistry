"""Titik awal kriteria untuk kebutuhan industri yang umum. Pengguna tetap bisa mengubah angkanya."""

PRESETS = [
    {
        "id": "pelarut",
        "name": "Pelarut serbaguna",
        "description": "Cair pada suhu ruang, mudah diuapkan kembali, tidak terlalu mudah terbakar, tanpa halogen.",
        "criteria": {
            "boiling_point": {"min": 60, "max": 160, "weight": 2},
            "melting_point": {"max": 0, "weight": 1},
            "viscosity": {"max": 2, "weight": 1},
            "flash_point": {"min": 20, "weight": 2},
        },
        "exclude_groups": ["halogen", "nitro"],
    },
    {
        "id": "pelumas",
        "name": "Minyak dasar pelumas suhu tinggi",
        "description": "Tidak mudah menguap, tetap cair di suhu rendah, kental, dan titik nyala tinggi.",
        "criteria": {
            "boiling_point": {"min": 320, "weight": 2},
            "melting_point": {"max": 0, "weight": 1},
            "viscosity": {"min": 10, "max": 200, "weight": 2},
            "flash_point": {"min": 200, "weight": 2},
        },
        "exclude_groups": ["halogen"],
    },
    {
        "id": "fluida_panas",
        "name": "Fluida perpindahan panas",
        "description": "Rentang cair lebar, stabil pada suhu tinggi, dan tidak menyala sendiri.",
        "criteria": {
            "boiling_point": {"min": 250, "weight": 2},
            "melting_point": {"max": -10, "weight": 2},
            "autoignition": {"min": 350, "weight": 2},
            "viscosity": {"max": 30, "weight": 1},
        },
        "exclude_groups": [],
    },
    {
        "id": "plasticizer",
        "name": "Plasticizer",
        "description": "Ester bermolekul sedang yang sangat sulit menguap dan tetap cair.",
        "criteria": {
            "mw": {"min": 250, "max": 450, "weight": 1},
            "boiling_point": {"min": 300, "weight": 1},
            "melting_point": {"max": 0, "weight": 1},
            "vapor_pressure": {"max": 0.001, "weight": 2},
        },
        "include_groups": ["ester"],
        "exclude_groups": ["halogen"],
    },
    {
        "id": "oksigenat",
        "name": "Aditif bahan bakar (oksigenat)",
        "description": "Eter atau alkohol yang larut dalam bensin, titik didih rendah, dan tidak membeku.",
        "criteria": {
            "boiling_point": {"min": 50, "max": 150, "weight": 2},
            "melting_point": {"max": -20, "weight": 1},
            "density": {"min": 0.7, "max": 0.85, "weight": 1},
            "logp": {"min": 0.5, "max": 3, "weight": 1},
        },
        "exclude_groups": ["halogen", "nitro", "sulfon", "aromatik"],
    },
    {
        "id": "refrigeran",
        "name": "Refrigeran",
        "description": "Mendidih di bawah 0 °C pada tekanan normal dengan molekul kecil.",
        "criteria": {
            "boiling_point": {"min": -60, "max": -5, "weight": 3},
            "mw": {"max": 160, "weight": 1},
        },
        "exclude_groups": [],
    },
]

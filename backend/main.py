import json
import os
import urllib.parse
import urllib.request
import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from chem_engine import (
    COMPOUND_LIBRARY,
    DISCOVERY_TEMPLATES,
    calculate_smiles_properties,
    recommend_compounds,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(BASE_DIR, "web")
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chem_db.json")

app = FastAPI(title="Chemistry Portal (A25-CS106)", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_db() -> dict:
    if not os.path.exists(DB_FILE):
        initial = {
            "users": [
                {
                    "username": "Bayu Wicaksono",
                    "fullName": "Bayu Wicaksono",
                    "email": "bayu@chemdiscovery.id",
                    "role": "Peneliti & Edukator Kimia",
                    "password": "chem123",
                    "photoUrl": "",
                }
            ],
            "history": [],
            "favorites": [],
        }
        save_db(initial)
        return initial
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"users": [], "history": [], "favorites": []}


def save_db(db: dict) -> None:
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)


class DiscoverReq(BaseModel):
    category: str = "All"
    bp_min: Optional[float] = None
    bp_max: Optional[float] = None
    visc_min: Optional[float] = None
    visc_max: Optional[float] = None
    thermal_min: Optional[float] = None
    solubility: str = "Any"
    prompt_text: str = ""
    input_mode: str = "Structured Form"


class SmilesReq(BaseModel):
    smiles: str


class ChatReq(BaseModel):
    message: str


class FavReq(BaseModel):
    compound_id: str


class LoginReq(BaseModel):
    identifier: str
    password: str


class RegisterReq(BaseModel):
    fullName: str
    username: str
    email: Optional[str] = ""
    password: str


class ProfileUpdateReq(BaseModel):
    originalUsername: str
    username: str
    fullName: str
    email: Optional[str] = ""
    role: Optional[str] = ""
    photoUrl: Optional[str] = ""


class PasswordChangeReq(BaseModel):
    username: str
    oldPassword: str
    newPassword: str


@app.get("/api/templates")
def get_templates():
    return {"ok": True, "templates": DISCOVERY_TEMPLATES}


@app.get("/api/compounds")
def get_all_compounds():
    return {"ok": True, "compounds": COMPOUND_LIBRARY}


@app.post("/api/discover")
def run_discovery(req: DiscoverReq):
    res = recommend_compounds(
        category=req.category,
        bp_min=req.bp_min,
        bp_max=req.bp_max,
        visc_min=req.visc_min,
        visc_max=req.visc_max,
        thermal_min=req.thermal_min,
        solubility=req.solubility,
        prompt_text=req.prompt_text,
    )
    record = {
        "id": "DISC-" + str(uuid.uuid4())[:6].upper(),
        "input_mode": req.input_mode,
        "category": req.category,
        "prompt_text": req.prompt_text or f"{req.category} (BP {req.bp_min or '-'}–{req.bp_max or '-'}°C)",
        "avg_confidence": res["avg_confidence"],
        "analysis_summary": res["analysis_summary"],
        "compounds": res["compounds"],
        "createdAt": datetime.now().strftime("%d %b %Y, %H:%M"),
    }
    db = load_db()
    db["history"].insert(0, record)
    save_db(db)
    return {"ok": True, "discovery": record}


@app.get("/api/history")
def get_history():
    db = load_db()
    return {"ok": True, "history": db.get("history", [])}


@app.delete("/api/history/{disc_id}")
def delete_history(disc_id: str):
    db = load_db()
    db["history"] = [h for h in db.get("history", []) if h["id"] != disc_id]
    save_db(db)
    return {"ok": True}


@app.get("/api/favorites")
def get_favorites():
    db = load_db()
    fav_ids = db.get("favorites", [])
    fav_compounds = [c for c in COMPOUND_LIBRARY if c["id"] in fav_ids]
    return {"ok": True, "favorites": fav_compounds, "favorite_ids": fav_ids}


@app.post("/api/favorites/toggle")
def toggle_favorite(req: FavReq):
    db = load_db()
    favs = db.get("favorites", [])
    if req.compound_id in favs:
        favs.remove(req.compound_id)
        added = False
    else:
        favs.append(req.compound_id)
        added = True
    db["favorites"] = favs
    save_db(db)
    return {"ok": True, "added": added, "favorite_ids": favs}


@app.post("/api/calculator")
def calc_smiles(req: SmilesReq):
    return calculate_smiles_properties(req.smiles)


def _wiki_quick_answer(query_text: str) -> Optional[str]:
    clean = query_text.lower().strip()
    for prefix in ("apa itu ", "apakah ", "jelaskan tentang ", "jelaskan ", "pengertian ", "siapa ", "tentang ", "mengapa ", "bagaimana "):
        if clean.startswith(prefix):
            clean = clean[len(prefix):].strip()
    search_q = clean or query_text
    for lang in ("id", "en"):
        try:
            sq = urllib.parse.urlencode(
                {"action": "opensearch", "search": search_q, "limit": 1, "format": "json"}
            )
            req = urllib.request.Request(
                f"https://{lang}.wikipedia.org/w/api.php?{sq}",
                headers={"User-Agent": "ChemistryChety/1.0"},
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            titles = data[1] if len(data) > 1 else []
            if not titles:
                continue
            eq = urllib.parse.urlencode(
                {
                    "action": "query",
                    "format": "json",
                    "prop": "extracts",
                    "titles": titles[0],
                    "exintro": 1,
                    "explaintext": 1,
                    "redirects": 1,
                }
            )
            req2 = urllib.request.Request(
                f"https://{lang}.wikipedia.org/w/api.php?{eq}",
                headers={"User-Agent": "ChemistryChety/1.0"},
            )
            with urllib.request.urlopen(req2, timeout=6) as resp2:
                d2 = json.loads(resp2.read().decode("utf-8"))
            page = next(iter(d2.get("query", {}).get("pages", {}).values()), {})
            extract = (page.get("extract") or "").strip()
            if extract:
                if len(extract) > 650:
                    extract = extract[:650].rsplit(".", 1)[0] + "."
                return f"{extract}\n\n(Referensi: Wikipedia {lang.upper()} — {titles[0]})"
        except Exception:
            continue
    return None


@app.post("/api/chat")
def ai_chemistry_chat(req: ChatReq):
    raw = req.message.strip()
    msg = raw.lower()
    if any(w in msg for w in ["jam", "pukul", "waktu", "tanggal", "hari ini", "skrg", "sekarang"]):
        now = datetime.now()
        reply = (
            f"Waktu server saat ini adalah {now.strftime('%H:%M:%S')} WIB, "
            f"tanggal {now.strftime('%d %B %Y')}."
        )
    elif any(w in msg for w in ["skincare", "kulit", "wajah", "serum", "moisturizer", "losion", "kosmetik", "niacinamide"]):
        reply = (
            "Prinsip aman merancang formula skincare ramah kulit:\n"
            "1. Gunakan pelarut & humektan ringan seperti Air Deionisasi, Gliserin (3-5%), atau Panthenol untuk menjaga hidrasi.\n"
            "2. Pilih surfaktan lembut bebas sulfat keras (contoh: Coco-Glucoside atau Hexyl Triethoxylate dosis rendah untuk pembersih).\n"
            "3. Atur pH formula di rentang alami kulit (pH 4.5 - 5.5) dengan larutan dapar asam sitrat.\n"
            "4. Wajib memakai pengawet cosmetic-grade aman (seperti Phenoxyethanol dosis <= 1%) agar bebas pertumbuhan mikroba, serta lakukan uji tempel (patch test)."
        )
    elif any(w in msg for w in ["surfaktan", "sabun", "cuci", "surfactant", "deterjen"]):
        reply = (
            "Untuk kebutuhan surfaktan yang aman dan ramah lingkungan, Anda dapat memilih "
            "Hexyl Triethoxylate atau Octyl Glycerol Ether. Keduanya berbahan dasar nabati, "
            "mudah terurai secara alami (biodegradable), dan lembut untuk penggunaan rumah tangga."
        )
    elif any(w in msg for w in ["plastik", "kemasan", "makanan", "polimer", "polymer", "bioplastik"]):
        reply = (
            "Untuk kemasan makanan yang aman, Polylactic Acid (PLA) berbahan pati nabati "
            "atau pelentur Triethyl Citrate (turunan asam sitrat) direkomendasikan karena bebas ftalat, bebas BPA, dan stabil."
        )
    elif any(w in msg for w in ["pelarut", "solvent", "ekstrak", "jeruk", "pembersih"]):
        reply = (
            "Ethyl Lactate dan D-Limonene merupakan kandidat Green Solvent yang efektif untuk melarutkan minyak/residu ringan "
            "dengan profil toksisitas jauh lebih rendah dibanding pelarut berbasis petroleum."
        )
    elif any(w in msg for w in ["lipinski", "logp", "titik didih", "smiles", "berat molekul"]):
        reply = (
            "Aturan Lipinski (Rule of Five) menilai kestabilan dan profil kelarutan molekul: "
            "Berat Molekul <= 500 g/mol, LogP <= 5, Donor Ikatan H <= 5, dan Akseptor <= 10. "
            "Anda dapat langsung memasukkan string SMILES ke menu Kalkulator Molekul untuk mengujinya."
        )
    elif msg in ["halo", "hai", "hi", "hello", "pagi", "siang", "sore", "malam", "test", "tes"]:
        reply = (
            "Halo, saya Chety, asisten riset Chemistry Anda. Tanyakan topik kimia apa saja, "
            "mulai dari formulasi skincare/pembersih aman, penjelasan senyawa, aturan Lipinski, hingga perhitungan sifat molekul."
        )
    else:
        wiki_ans = _wiki_quick_answer(raw)
        if wiki_ans:
            reply = wiki_ans
        else:
            reply = (
                f"Saya belum menemukan catatan spesifik untuk '{raw}'. Coba sebutkan nama senyawa, notasi SMILES, "
                "atau topik spesifik seperti surfaktan, pelarut hijau, biopolimer, skincare, atau uji Lipinski agar Chety dapat menjelaskan lebih tepat."
            )
    return {"ok": True, "reply": reply}


@app.post("/api/auth/login")
def login(req: LoginReq):
    db = load_db()
    ident = req.identifier.strip().lower()
    user = next(
        (u for u in db["users"] if u["username"].lower() == ident or u.get("email", "").lower() == ident),
        None,
    )
    if not user:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan.")
    if user.get("password") != req.password:
        raise HTTPException(status_code=401, detail="Kata sandi salah.")
    return {"ok": True, "user": user}


@app.post("/api/auth/register")
def register(req: RegisterReq):
    db = load_db()
    uname = req.username.strip()
    if not uname or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Username wajib diisi & kata sandi min. 6 karakter.")
    if any(u["username"].lower() == uname.lower() for u in db["users"]):
        raise HTTPException(status_code=400, detail="Username sudah terdaftar.")
    new_user = {
        "username": uname,
        "fullName": req.fullName.strip() or uname,
        "email": req.email.strip() if req.email else f"{uname.lower()}@chemdiscovery.id",
        "role": "Peneliti & Edukator",
        "password": req.password,
        "photoUrl": "",
    }
    db["users"].append(new_user)
    save_db(db)
    return {"ok": True, "user": new_user}


@app.post("/api/profile/update")
def update_profile(req: ProfileUpdateReq):
    db = load_db()
    user = next((u for u in db["users"] if u["username"].lower() == req.originalUsername.lower()), None)
    if not user:
        user = {"username": req.username, "password": "chem123"}
        db["users"].append(user)
    user["username"] = req.username.strip()
    user["fullName"] = req.fullName.strip()
    user["email"] = req.email or ""
    user["role"] = req.role or "Peneliti"
    if req.photoUrl is not None:
        user["photoUrl"] = req.photoUrl
    save_db(db)
    return {"ok": True, "user": user}


@app.post("/api/profile/password")
def change_password(req: PasswordChangeReq):
    db = load_db()
    user = next((u for u in db["users"] if u["username"].lower() == req.username.lower()), None)
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan.")
    if user.get("password") != req.oldPassword:
        raise HTTPException(status_code=400, detail="Kata sandi lama salah.")
    user["password"] = req.newPassword
    save_db(db)
    return {"ok": True}


@app.get("/api/stats")
def get_stats():
    db = load_db()
    history = db.get("history", [])
    favs = db.get("favorites", [])
    total_disc = len(history)
    total_comp = sum(len(h.get("compounds", [])) for h in history) or len(COMPOUND_LIBRARY)
    avg_conf = (
        round(sum(h.get("avg_confidence", 0.9) for h in history) / total_disc, 2)
        if total_disc > 0
        else 0.92
    )
    structured_count = sum(1 for h in history if "structured" in h.get("input_mode", "").lower())
    prompt_count = sum(1 for h in history if "prompt" in h.get("input_mode", "").lower() or "ai" in h.get("input_mode", "").lower())
    template_count = max(0, total_disc - structured_count - prompt_count)
    if total_disc == 0:
        structured_count, prompt_count, template_count = 3, 2, 4

    c90 = sum(1 for h in history if h.get("avg_confidence", 0.9) >= 0.9)
    c80 = sum(1 for h in history if 0.8 <= h.get("avg_confidence", 0.9) < 0.9)
    c70 = sum(1 for h in history if 0.7 <= h.get("avg_confidence", 0.9) < 0.8)
    clow = sum(1 for h in history if h.get("avg_confidence", 0.9) < 0.7)
    if total_disc == 0:
        c90, c80, c70, clow = 6, 2, 1, 0

    return {
        "ok": True,
        "stats": {
            "totalDiscoveries": total_disc,
            "totalCompounds": total_comp,
            "librarySize": len(COMPOUND_LIBRARY),
            "totalFavorites": len(favs),
            "avgConfidence": avg_conf,
            "thisWeek": max(total_disc, 1),
        },
        "charts": {
            "timeline": {
                "labels": ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
                "data": [1, 2, 1, 3, 2, 1, max(1, total_disc)],
            },
            "inputMode": {
                "labels": ["Structured Form", "AI Prompt", "Template Keluarga"],
                "data": [structured_count, prompt_count, template_count],
            },
            "confidence": {
                "labels": ["90-100%", "80-89%", "70-79%", "<70%"],
                "data": [c90, c80, c70, clow],
            },
        },
    }


@app.get("/api/chem-articles")
def get_chem_articles():
    art_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chem_articles.json")
    articles = []
    if os.path.exists(art_path):
        with open(art_path, "r", encoding="utf-8") as f:
            articles = json.load(f)
    return {"ok": True, "articles": articles}


@app.get("/logo_chemistry.png")
def serve_logo_chemistry():
    return FileResponse(os.path.join(WEB_DIR, "logo_chemistry.png"), media_type="image/png")


@app.get("/hero_chemistry.jpg")
def serve_hero_chemistry():
    return FileResponse(os.path.join(WEB_DIR, "hero_chemistry.jpg"), media_type="image/jpeg")


@app.get("/molecular-background.jpg")
def serve_molecular_bg():
    return FileResponse(os.path.join(WEB_DIR, "molecular-background.jpg"), media_type="image/jpeg")


@app.get("/", response_class=HTMLResponse)
def serve_web():
    with open(os.path.join(WEB_DIR, "index.html"), "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8087)))

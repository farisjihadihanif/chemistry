# Chemistry

Alat bantu penemuan senyawa kimia untuk peneliti dan insinyur industri kimia/petrokimia. Pengguna menentukan sifat yang dibutuhkan (titik didih, viskositas, titik nyala, dan lainnya). Chemistry menyaring senyawa yang punya data eksperimen di PubChem, lalu merancang kandidat struktur baru dan memprediksi sifatnya dengan model machine learning.

Dibangun ulang dari use case capstone ASAH (Dicoding × Accenture) A25-CS106, *Novel Chemicals Discovery Agent*.
Dibuat oleh Faris Jihadi Hanif Lubis.

## Fitur

- **Temukan senyawa:** isi kriteria lewat form (ada 6 preset kebutuhan industri), atau tulis kebutuhan dalam satu kalimat dan Gemini mengubahnya jadi kriteria angka. Bisa mewajibkan atau menghindari gugus fungsi.
- **Hasil yang bisa diperiksa:** setiap senyawa diberi skor kecocokan 0–100, dan setiap nilai ditandai sebagai data eksperimen PubChem atau prediksi model (dengan rentangnya). Posisi nilai terhadap rentang target digambar langsung, dan setiap senyawa diberi alasan singkat.
- **Kandidat senyawa baru:** turunan dari senyawa terbaik lewat 12 aturan modifikasi kimia, ditambah usulan Gemini. Semuanya divalidasi RDKit, diberi skor kesulitan sintesis, dan dicek apakah sudah terdaftar di PubChem.
- **Detail senyawa:** struktur 2D, semua sifat, klasifikasi bahaya GHS dari PubChem, dan senyawa mirip (Tanimoto).
- **Kalkulator sifat:** masukkan nama atau SMILES, lalu lihat data eksperimen atau prediksi.
- **Pustaka:** cari 12.776 senyawa berdasarkan nama, rumus, atau CID.
- **Fitur lain:** bandingkan senyawa (maks. 3), favorit dengan catatan dan tag, riwayat pencarian, ekspor CSV/JSON.
- **Asisten kimia:** tanya-jawab dengan Gemini; data senyawa yang sedang dibahas ikut dikirim.
- **Akun:** daftar, masuk, lupa password lewat email, ubah profil, hapus akun.
- **Admin:** statistik pemakaian dan kelola akun (peran, nonaktifkan, hapus).
- **Batas AI harian per pengguna** dan mode terang/gelap.

## Struktur

```
ml-service/  Python + FastAPI: RDKit, model Random Forest, pustaka PubChem, pembuat kandidat
api/         Node.js + Express + MongoDB: akun, penemuan, riwayat, favorit, asisten (Gemini), admin
web/         React + Vite + Tailwind
mobile/      Flutter (Android & iOS)
deploy/      Konfigurasi PM2, Nginx, dan skrip backup
```

Browser dan aplikasi mobile hanya berbicara dengan `api`. `ml-service` adalah layanan internal yang tidak dibuka ke publik.

## Data dan model

- **Sumber data:** anotasi sifat eksperimen PubChem (PUG-View, sebagian besar dari HSDB), diunduh dengan `ml-service/scripts/fetch_pubchem.py` lalu digabung dengan `scripts/build_dataset.py` menjadi `ml-service/data/compounds.csv`.
- **Pembersihan data:** teks seperti "352 °F at 12 mmHg" diubah ke satuan baku. Nilai batas, titik didih pada tekanan rendah, fase gas, dan nilai yang tidak masuk akal dibuang.
- **Model:** Random Forest per sifat dengan fitur 19 deskriptor RDKit ditambah sidik jari Morgan 512 bit. Model dilatih otomatis dari `compounds.csv` saat ml-service pertama kali jalan (sekitar 2–3 menit), atau manual dengan `python scripts/train.py`.
- **Akurasi** (validasi silang 5 lipatan):

  | Sifat | Data | MAE | R² |
  |---|---|---|---|
  | Titik didih | 3.590 | 26,7 °C | 0,76 |
  | Titik leleh | 9.133 | 33,0 °C | 0,81 |
  | Titik nyala | 1.557 | 22,9 °C | 0,73 |
  | Densitas | 4.273 | 0,06 g/cm³ | 0,78 |
  | Tekanan uap | 3.739 | 0,76 log | 0,87 |
  | Viskositas | 411 | 0,34 log | 0,58 |
  | Tegangan permukaan | 276 | 4,4 mN/m | 0,57 |
  | Suhu penyalaan sendiri | 705 | 68 °C | 0,40 |

## Menjalankan di laptop (Windows)

Kebutuhan: Node.js 20+, Python 3.10–3.13, Flutter 3.47+ (untuk aplikasi mobile), dan akun MongoDB Atlas.

1. Jalankan `setup-windows.bat` (sekali saja). Skrip ini membuat virtualenv Python dan memasang semua paket.
2. Isi `api\.env`: `MONGO_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`, dan `SMTP_*` (boleh sama dengan HNI-Project).
3. Jalankan `run-windows.bat`. Ini membuka tiga jendela: ml-service (port 5000), API (4100), dan web (5173).
4. Buka http://localhost:5173.

Menjalankan manual tanpa skrip:

```bash
cd ml-service && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt
python -m uvicorn app:app --port 5000
cd api && npm install && npm run dev
cd web && npm install && npm run dev
```

### Aplikasi mobile

```bash
cd mobile
flutter pub get
flutter run                                   # emulator Android memanggil API di 10.0.2.2:4100
flutter run --dart-define=API_URL=http://192.168.1.10:4100   # HP asli di Wi-Fi yang sama
flutter build apk --release --dart-define=API_URL=https://domainmu.id
```

Build iOS butuh Mac dengan Xcode (`flutter build ipa --dart-define=API_URL=https://domainmu.id`).

## Tes

```bash
cd ml-service && python -m pytest tests -q   # parser, skor, kandidat, endpoint
cd api && npm test                           # akun, penemuan, favorit, asisten, admin, lupa password
cd web && npm run lint && npm run build
cd mobile && flutter analyze && flutter test
```

Deploy: lihat [DEPLOY.md](DEPLOY.md).

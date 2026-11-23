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
- **Chesty:** maskot asisten kimia (Gemini); data senyawa yang sedang dibahas ikut dikirim.
- **Ganti akun & foto profil:** beberapa akun bisa diingat di satu perangkat; foto profil bisa digeser dan di-zoom sebelum disimpan.
- **Laporan:** hasil penemuan bisa diunduh sebagai Excel (2 sheet: ringkasan & hasil) atau JSON rapi.
- **Akun:** daftar, masuk, lupa password lewat email, ubah profil, hapus akun.
- **Admin:** statistik pemakaian dan kelola akun (peran, nonaktifkan, hapus).
- **Batas AI harian per pengguna** dan mode terang/gelap.

## Struktur

```
ml-service/  Python + FastAPI: RDKit, model Random Forest, pustaka PubChem, pembuat kandidat
api/         Node.js + Express + MongoDB: akun, penemuan, riwayat, favorit, Chesty (Gemini), admin
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

## Run locally

Needs Node.js 20+, Python 3.12+ (tested on 3.13.5) and a MongoDB database.

1. `setup-windows.bat` (once), then fill in `api/.env` (names in `api/.env.example`).
2. `run-windows.bat` starts ml-service (5000), API (4100) and web (5173). Open http://localhost:5173.

On other systems, run each part in its own terminal:

```bash
cd ml-service && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt -c constraints.txt
python -m uvicorn app:app --port 5000     # trains the models on the first request (2-3 minutes)
cd api && npm install && npm run dev
cd web && npm install && npm run dev
```

## Deploy (free)

1. **ml-service on Render:** New → Blueprint → this repo (`render.yaml`). Render generates `ML_SERVICE_TOKEN`. The service sleeps after 15 idle minutes; waking takes about a minute.
2. **API on Vercel:** new project, root directory `api`. Set:
   - Required: `MONGO_URL`, `JWT_SECRET` (16+ characters), `CLIENT_ORIGIN`, `APP_URL` (both the web URL), `ML_SERVICE_URL` (the Render URL), `ML_SERVICE_TOKEN` (same value as on Render), `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
   - Optional: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `AI_DAILY_LIMIT`, `JWT_DAYS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CONTACT_EMAIL`
   - Leave `CROSS_SITE_COOKIE` unset. MongoDB Atlas must allow access from anywhere (`0.0.0.0/0`).
3. **Web on Vercel:** put the API's URL in `web/vercel.json` if it is not `https://chemistry-api.vercel.app`, then create a project with root directory `web`. Leave `VITE_API_URL` unset: `/api` is proxied, so login cookies stay first-party.
4. Check `/api/health` on the web URL. A 503 answer names the missing variable or the MongoDB error type.

## Aplikasi mobile

```bash
cd mobile
flutter pub get
flutter run                                   # emulator Android memanggil API di 10.0.2.2:4100
flutter run -d chrome                         # API (mode dev) menerima localhost port berapa pun
flutter run -d <id-hp> --dart-define=API_URL=http://192.168.1.10:4100   # HP asli, Wi-Fi yang sama
flutter build apk --release --dart-define=API_URL=https://domainmu.id
```

HP asli lewat kabel USB:

1. Pasang Android Studio sekali (untuk Android SDK), lalu `flutter doctor --android-licenses`.
2. Di HP: Pengaturan → Tentang ponsel → ketuk *Nomor bentukan* 7x → Opsi pengembang → nyalakan **USB debugging** (Xiaomi: juga *Install via USB*). Terima pop-up izin saat kabel dicolok.
3. `flutter devices` harus menampilkan HP-mu. Pakai IPv4 laptop dari `ipconfig` sebagai `API_URL`, dan izinkan Node di Windows Firewall (Private network).

Menambah data eksperimen dari CSV/Kaggle (kolom SMILES + kolom nilai):

```bash
cd ml-service
python scripts/import_dataset.py --kaggle pemilik/nama-dataset --file data.csv --smiles SMILES --kolom bp --sifat boiling_point --satuan K
python scripts/train.py      # latih ulang, lalu restart ml-service
```

Token Kaggle (`kaggle.json`) diletakkan di `C:\Users\<nama>\.kaggle\kaggle.json`.

Build iOS butuh Mac dengan Xcode (`flutter build ipa --dart-define=API_URL=https://domainmu.id`).

## Tes

```bash
cd ml-service && python -m pytest tests -q   # parser, skor, kandidat, endpoint
cd api && npm test                           # akun, ganti akun, foto, penemuan, laporan, Chesty, admin
cd web && npm run lint && npm run build
cd mobile && flutter analyze && flutter test
```

Deploy di VPS sendiri: lihat [DEPLOY.md](DEPLOY.md).

## Copyright

© 2026 Faris Jihadi Hanif Lubis. All rights reserved.

This repository is public for portfolio and review purposes only. No license is granted: you may view the code, but you may not copy, modify, redistribute, or use it in other projects without my written permission.

Repositori ini dipublikasikan hanya untuk keperluan portofolio. Kode boleh dilihat, tetapi tidak boleh disalin, diubah, disebarkan, atau digunakan tanpa izin tertulis dari saya.

Contact: [LinkedIn](https://www.linkedin.com/in/faris-jihadi-hanif-lubis-62337a286/)

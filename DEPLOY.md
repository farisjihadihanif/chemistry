# Panduan deploy Chemistry

Satu VPS menjalankan dua proses: **API Node** (sekaligus menyajikan web hasil build) dan **ml-service Python**. Database ada di MongoDB Atlas, AI lewat Gemini, dan email lewat Gmail SMTP. Ganti `domainmu.id` dengan domain asli.

## Kebutuhan

- **Server:** VPS Ubuntu 22.04/24.04, minimal 2 vCPU dan **4 GB RAM**. ml-service memuat model Random Forest sekitar 1–1,5 GB.
- **Perangkat lunak:** Node.js 20+, Python 3.11+ (`python3-venv`), Nginx, Certbot, PM2, dan `mongodb-database-tools` untuk backup.
- **Domain:** `domainmu.id` dan `www` diarahkan (A record) ke IP VPS.

## Sebelum deploy

1. **Rahasia baru untuk server:** buat `JWT_SECRET` dan `ML_SERVICE_TOKEN` khusus server, jangan pakai yang dari laptop. Ganti juga password database yang pernah terlihat di screenshot atau chat.
2. **Atlas > Network Access:** tambahkan IP VPS.
3. **Gemini:** pastikan kuota API key cukup. Batasi pemakaian per orang dengan `AI_DAILY_LIMIT`.

## Langkah

1. **Keamanan dasar:** aktifkan firewall dengan `ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`. Port 4100 dan 5000 **jangan** dibuka ke publik.
2. **Kode:** salin proyek ke `/srv/chemistry` tanpa `node_modules`, `.venv`, `.env`, dan `ml-service/models`.
3. **ml-service:**
   ```bash
   cd /srv/chemistry/ml-service
   python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
   cp .env.example .env            # isi ML_SERVICE_TOKEN
   .venv/bin/python scripts/train.py   # melatih model (sekitar 3 menit, sekali saja)
   ```
4. **API dan web:**
   ```bash
   cd /srv/chemistry/web && npm ci && npm run build
   cd /srv/chemistry/api && npm ci --omit=dev
   cp .env.example .env && chmod 600 .env   # isi sesuai tabel di bawah
   ```
5. **Jalankan dengan PM2:**
   ```bash
   sudo mkdir -p /var/log/chemistry && sudo chown $USER /var/log/chemistry
   pm2 start deploy/ecosystem.config.js
   pm2 save && pm2 startup
   pm2 logs --lines 30   # harus ada "Pustaka: 12776 senyawa" dan "ml-service tersambung"
   ```
6. **Nginx dan HTTPS:**
   1. Salin `deploy/nginx-chemistry.conf` ke `/etc/nginx/sites-available/domainmu.id` dan ganti nama domainnya.
   2. Aktifkan, lalu jalankan `sudo nginx -t && sudo systemctl reload nginx`.
   3. Pasang sertifikat: `sudo certbot --nginx -d domainmu.id -d www.domainmu.id`.
7. **Backup harian:** jadwalkan `deploy/backup.sh` lewat cron (contohnya ada di dalam file). Atlas M0 tidak punya backup otomatis.
8. **Pemantauan:** daftarkan `https://domainmu.id/api/health` di UptimeRobot, lalu pasang rotasi log dengan `pm2 install pm2-logrotate`.
9. **Aplikasi mobile:** `flutter build apk --release --dart-define=API_URL=https://domainmu.id` (Android). iOS dibuild di Mac. Sebelum rilis ke Play Store, buat keystore sendiri dan atur `signingConfig` rilis di `mobile/android/app/build.gradle.kts`.
10. **Uji setelah online:**
    - Daftar akun, lalu coba *Lupa password* sampai email masuk.
    - Cari senyawa lewat form dan lewat kalimat.
    - Buka detail senyawa sampai data bahaya muncul.
    - Simpan favorit, coba kalkulator dan asisten.
    - Masuk sebagai admin dan cek dasbor.

## Isi `api/.env`

| Variabel | Keterangan |
|---|---|
| `MONGO_URL` | Connection string Atlas. |
| `JWT_SECRET` | Teks acak panjang: `openssl rand -hex 32`. |
| `PORT` | `4100`. |
| `CLIENT_ORIGIN` | `https://domainmu.id,https://www.domainmu.id` |
| `APP_URL` | `https://domainmu.id` (link di email lupa password). |
| `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Admin pertama. Setelah masuk, ganti password lewat halaman Akun. |
| `ML_SERVICE_URL`, `ML_SERVICE_TOKEN` | `http://127.0.0.1:5000` dan token yang sama dengan `ml-service/.env`. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI untuk mode kalimat, usulan senyawa, alasan, dan asisten. Tanpa key, mode form tetap jalan dengan alasan berbasis data. |
| `AI_DAILY_LIMIT` | Batas permintaan AI per pengguna per hari. Default `30`, admin tidak dibatasi. |
| `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Gmail dengan App Password. |
| `CONTACT_EMAIL` | Email di halaman Privasi. |

## Memperbarui data PubChem

```bash
cd ml-service
.venv/bin/python scripts/fetch_pubchem.py --out data/raw        # unduh anotasi (sekitar 80 MB, beberapa menit)
.venv/bin/python scripts/build_dataset.py --raw data/raw --out data/compounds.csv
.venv/bin/python scripts/train.py
pm2 restart chemistry-ml
```

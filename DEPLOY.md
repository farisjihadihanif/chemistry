# Panduan Deploy Chemistry

Dokumen ini untuk penyedia jasa deploy. Isinya: apa yang dijalankan, server yang dibutuhkan, langkah pemasangan, dan cara memastikan semuanya berjalan.

- **Pemilik proyek:** Faris Jihadi Hanif Lubis
- **Domain:** `domainmu.id`. Ganti di semua tempat dengan domain asli yang diberikan pemilik.
- **Nilai rahasia** (password database, API key, dan sejenisnya) **tidak ada di repositori**. Pemilik memberikannya terpisah lewat jalur pribadi. Jangan menaruhnya di chat grup, issue, atau commit.

---

## 1. Gambaran sistem

Chemistry adalah aplikasi web dan Android untuk mencari senyawa kimia berdasarkan sifat yang dibutuhkan. Di server berjalan **dua proses**:

| Proses | Teknologi | Port lokal | Tugas |
|---|---|---|---|
| `chemistry-api` | Node.js 20+ (Express) | `4100` | API, login, database, **sekaligus menyajikan website** (hasil build `web/dist`) |
| `chemistry-ml` | Python 3.11+ (FastAPI, RDKit, scikit-learn) | `5000` | Perhitungan kimia dan model perkiraan sifat. Hanya dipanggil oleh API. |

Alur permintaan dari pengguna:

```
Pengguna (browser / aplikasi Android)
        │  HTTPS 443
        ▼
      Nginx  ──►  chemistry-api :4100  ──►  chemistry-ml :5000
                        │
                        ├──► MongoDB Atlas (database, cloud)
                        ├──► Google Gemini API (fitur kalimat & asisten Chesty)
                        ├──► PubChem (data bahaya senyawa, publik)
                        └──► Gmail SMTP (email lupa password)
```

Port `4100` dan `5000` **tidak boleh dibuka ke internet**. Hanya Nginx (80/443) dan SSH yang terbuka.

Struktur repositori:

```
api/          backend Node.js
web/          website React (di-build jadi web/dist, disajikan oleh api)
ml-service/   layanan Python + data senyawa (data/compounds.csv)
mobile/       aplikasi Flutter (Android), tidak dipasang di server
deploy/       ecosystem.config.js (PM2), nginx-chemistry.conf, backup.sh
```

---

## 2. Kebutuhan server

| Komponen | Minimal |
|---|---|
| Sistem operasi | Ubuntu 22.04 atau 24.04 LTS |
| CPU / RAM | 2 vCPU / **4 GB RAM**. ml-service memakai sekitar 1–2 GB saat berjalan. |
| Disk | 10 GB kosong |
| Perangkat lunak | Node.js 20 LTS, Python 3.11+ dengan `python3-venv`, Nginx, Certbot, PM2 (`npm i -g pm2`), `mongodump` (paket `mongodb-database-tools`) |

Database **tidak** dipasang di server. Database memakai MongoDB Atlas (cloud).

---

## 3. Yang disiapkan pemilik sebelum deploy

Pemilik memberikan nilai-nilai ini secara pribadi:

- [ ] Domain sudah diarahkan ke IP server: A record untuk `domainmu.id` dan `www.domainmu.id`.
- [ ] **Connection string MongoDB Atlas** (`MONGO_URL`), dengan password database yang **baru** (yang lama sudah pernah terlihat, wajib diganti).
- [ ] **Gemini API key** (`GEMINI_API_KEY`).
- [ ] **Akun Gmail + App Password** untuk email lupa password (`SMTP_USER`, `SMTP_PASS`).
- [ ] Email, username, dan password awal **akun admin**.
- [ ] Email kontak untuk halaman Privasi (`CONTACT_EMAIL`).

Yang dikerjakan penyedia deploy di Atlas (atau oleh pemilik, bila akses tidak dibagikan): **Network Access → tambahkan IP publik server.**

---

## 4. Langkah pemasangan

### 4.1 Keamanan dasar server

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 4.2 Ambil kode

Salin repositori ke `/srv/chemistry`. Folder `node_modules`, `.venv`, `.env`, dan `ml-service/models` **tidak** ikut disalin; semuanya dibuat di server.

```bash
sudo mkdir -p /srv/chemistry && sudo chown $USER /srv/chemistry
# salin isi repositori ke /srv/chemistry (git clone / rsync / scp)
```

### 4.3 ml-service (Python)

```bash
cd /srv/chemistry/ml-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env && chmod 600 .env     # isi ML_SERVICE_TOKEN (lihat bagian 5)
.venv/bin/python scripts/train.py          # melatih model, ±3–5 menit, cukup sekali
```

Perintah `train.py` harus menampilkan 8 baris hasil, dari `boiling_point` sampai `surface_tension`. Model disimpan di `ml-service/models/`.

### 4.4 Website dan API (Node.js)

```bash
cd /srv/chemistry/web
npm ci
npm run build                               # menghasilkan web/dist

cd /srv/chemistry/api
npm ci --omit=dev
cp .env.example .env && chmod 600 .env      # isi sesuai bagian 5
```

### 4.5 Jalankan dengan PM2

```bash
sudo mkdir -p /var/log/chemistry && sudo chown $USER /var/log/chemistry
cd /srv/chemistry
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup                                 # jalankan perintah yang ditampilkannya
pm2 install pm2-logrotate
pm2 logs --lines 40
```

Log API yang benar memuat `MongoDB tersambung.` dan `ml-service tersambung: 16115 senyawa di pustaka.` Kalau ada error, lihat bagian 8.

`deploy/ecosystem.config.js` sudah mengatur `NODE_ENV=production` untuk API. **Jangan dihapus**, karena pengaturan keamanan (cookie aman, CORS ketat) bergantung padanya.

### 4.6 Nginx dan HTTPS

```bash
sudo cp /srv/chemistry/deploy/nginx-chemistry.conf /etc/nginx/sites-available/domainmu.id
sudo sed -i 's/domainmu.id/DOMAIN-ASLI/g' /etc/nginx/sites-available/domainmu.id
sudo ln -s /etc/nginx/sites-available/domainmu.id /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d DOMAIN-ASLI -d www.DOMAIN-ASLI
```

Konfigurasi Nginx sudah memuat dua pengaturan khusus. Keduanya **perlu dipertahankan**:
- `client_max_body_size 2m` untuk unggah foto profil.
- `proxy_read_timeout 180s`, karena pencarian dengan AI bisa sampai 1–2 menit.

### 4.7 Backup harian database

```bash
crontab -e
# tambahkan baris:
20 2 * * * /srv/chemistry/deploy/backup.sh >> /var/log/chemistry/backup.log 2>&1
```

Backup disimpan di `~/backup-chemistry`, 14 hari terakhir. Atlas versi gratis tidak punya backup otomatis, jadi langkah ini penting.

### 4.8 Pemantauan

Daftarkan `https://DOMAIN-ASLI/api/health` di UptimeRobot (atau sejenisnya). Jawaban yang benar: `{"ok":true}`.

---

## 5. Isi file `.env`

### `api/.env`

| Variabel | Isi |
|---|---|
| `MONGO_URL` | Dari pemilik (connection string Atlas). |
| `JWT_SECRET` | **Buat baru di server:** `openssl rand -hex 32` |
| `JWT_DAYS` | `7` |
| `PORT` | `4100` |
| `CLIENT_ORIGIN` | `https://DOMAIN-ASLI,https://www.DOMAIN-ASLI` |
| `APP_URL` | `https://DOMAIN-ASLI` (untuk link di email lupa password) |
| `CROSS_SITE_COOKIE` | `false` (website dan API satu domain) |
| `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Dari pemilik. Akun admin dibuat otomatis saat API pertama kali jalan. |
| `ML_SERVICE_URL` | `http://127.0.0.1:5000` |
| `ML_SERVICE_TOKEN` | **Buat baru di server:** `openssl rand -hex 32`. Nilainya **harus sama** dengan di `ml-service/.env`. |
| `GEMINI_API_KEY` | Dari pemilik. |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | Biarkan sesuai `.env.example`. |
| `AI_DAILY_LIMIT` | `30` (batas pemakaian AI per pengguna per hari; admin tidak dibatasi). |
| `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Dari pemilik (Gmail + App Password). |
| `CONTACT_EMAIL` | Dari pemilik. |

### `ml-service/.env`

| Variabel | Isi |
|---|---|
| `ML_SERVICE_TOKEN` | Sama persis dengan `ML_SERVICE_TOKEN` di `api/.env`. |

Kedua file `.env` harus `chmod 600` dan **tidak boleh** di-commit ke git.

---

## 6. Pengecekan setelah online

Centang semuanya sebelum serah terima:

- [ ] `https://DOMAIN-ASLI` terbuka dengan gembok HTTPS. Beranda tampil dengan animasi orbit.
- [ ] `https://DOMAIN-ASLI/api/health` menjawab `{"ok":true}`.
- [ ] Daftar akun baru berhasil, lalu keluar dan masuk lagi.
- [ ] **Lupa password:** email masuk ke inbox, dan link-nya membuka `https://DOMAIN-ASLI/...`, bukan localhost.
- [ ] **Temukan → Isi kriteria:** pilih "Pelarut serbaguna" lalu Cari. Hasil muncul.
- [ ] **Temukan → Tulis kebutuhan:** tulis satu kalimat lalu Cari. Hasil muncul (menguji Gemini).
- [ ] Di halaman hasil, unduh **Laporan Excel** dan **JSON**. Kedua file terbuka normal.
- [ ] Buka detail satu senyawa. Gambar struktur dan data bahaya tampil.
- [ ] Buka **Chesty** dan kirim satu pertanyaan. Jawaban muncul.
- [ ] **Akun → unggah foto profil.** Foto tersimpan dan tampil di pojok kanan atas.
- [ ] **Tambah akun → masuk akun kedua → ganti akun** lewat menu profil.
- [ ] Masuk sebagai admin. Halaman **Admin** tampil dengan daftar pengguna.
- [ ] `pm2 status` menunjukkan kedua proses `online`. Jalankan `sudo reboot`, lalu pastikan keduanya hidup lagi otomatis.
- [ ] Port `4100` dan `5000` **tidak** bisa diakses dari luar server (coba `curl http://IP-SERVER:4100` dari komputer lain; harus gagal).

---

## 7. Aplikasi Android (dikerjakan pemilik, setelah server online)

Aplikasi Android tidak dipasang di server. Setelah domain aktif, pemilik membuild ulang aplikasi dengan alamat server asli:

```bash
cd mobile
flutter build apk --release --dart-define=API_URL=https://DOMAIN-ASLI
```

Untuk rilis ke Play Store, buat keystore rilis dan atur `signingConfig` di `mobile/android/app/build.gradle.kts`.

---

## 8. Masalah yang sering muncul

| Gejala | Penyebab dan solusi |
|---|---|
| Halaman memuat, tapi muncul "Layanan analisis kimia sedang tidak aktif" | ml-service belum jalan atau tokennya beda. Cek `pm2 logs chemistry-ml`, dan pastikan `ML_SERVICE_TOKEN` sama di kedua `.env`. |
| ml-service berhenti sendiri / dimatikan sistem | RAM kurang. Server butuh minimal 4 GB, atau tambahkan swap 2 GB. |
| API gagal start: `MongoServerSelectionError` | IP server belum ditambahkan di Atlas → Network Access, atau `MONGO_URL` salah. |
| Login berhasil tapi langsung keluar lagi | Situs dibuka lewat `http://`, bukan `https://`. Cookie login hanya berlaku di HTTPS. Pastikan certbot sudah dipasang. |
| Error 413 saat unggah foto | `client_max_body_size` di Nginx terhapus. Kembalikan ke `2m`. |
| Error 504 saat pencarian dengan kalimat | `proxy_read_timeout` di Nginx terlalu kecil. Kembalikan ke `180s`. |
| Email lupa password tidak terkirim | `SMTP_PASS` harus **App Password** Gmail (16 karakter), bukan password biasa. |
| Mode "Tulis kebutuhan" dan Chesty tidak tersedia | `GEMINI_API_KEY` kosong atau kuotanya habis. Fitur lain tetap jalan. |

---

## 9. Pembaruan aplikasi di kemudian hari

```bash
cd /srv/chemistry
# ambil kode terbaru (git pull / salin ulang), lalu:
cd web && npm ci && npm run build
cd ../api && npm ci --omit=dev
cd ../ml-service && .venv/bin/pip install -r requirements.txt
# hanya bila ml-service/data/compounds.csv berubah:
.venv/bin/python scripts/train.py
pm2 restart all
```

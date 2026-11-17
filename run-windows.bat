@echo off
REM Menjalankan ml-service, API, dan web sekaligus (masing-masing di jendela sendiri).
cd /d "%~dp0"
start "Chemistry ml-service" cmd /k "cd ml-service && .venv\Scripts\activate && python -m uvicorn app:app --port 5000"
start "Chemistry API" cmd /k "cd api && npm run dev"
start "Chemistry web" cmd /k "cd web && npm run dev"
echo Web: http://localhost:5173  (tunggu ml-service siap; jalan pertama melatih model sekitar 3 menit)

@echo off
REM Pasang semua kebutuhan Chemistry di Windows (sekali saja).
cd /d "%~dp0"
echo == ml-service (Python) ==
cd ml-service
if not exist .venv python -m venv .venv
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
if not exist .env copy .env.example .env
call deactivate
cd ..
echo == api (Node) ==
cd api
call npm install
if not exist .env copy .env.example .env
cd ..
echo == web (React) ==
cd web
call npm install
cd ..
echo.
echo Selesai. Isi api\.env (MONGO_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, GEMINI_API_KEY, SMTP_*), lalu jalankan run-windows.bat
pause

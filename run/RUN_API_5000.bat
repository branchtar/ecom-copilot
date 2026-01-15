@echo off
setlocal
cd /d "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot\api"
if not exist ".venv" (
  python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 5000 --reload
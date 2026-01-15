@echo off
set ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot

cd /d "%ROOT%\ps1"
powershell -ExecutionPolicy Bypass -File ".\ecom_copilot_run_api.ps1"

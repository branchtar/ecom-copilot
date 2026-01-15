@echo off
setlocal

REM Launch Ecom Copilot Supplier Pricing (Amazon)
cd /d "C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
powershell -ExecutionPolicy Bypass -File ".\ps1\ecom_copilot_run_supplier_pricing.ps1"

endlocal

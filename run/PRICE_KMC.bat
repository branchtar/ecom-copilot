@echo off
setlocal EnableExtensions

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
set "PY=py"
if exist "%ROOT%\api\.venv\Scripts\python.exe" set "PY=%ROOT%\api\.venv\Scripts\python.exe"

set "INPUT=C:\Users\Kylem\Downloads\KMC Main Database_20251105T190838-0500 (3).csv"
set "SKU_COL=ITEM# 24characters Max - SKU"
set "COST_COL=Dealer Pricing"
set "NAME_COL=Item Title (100 characters max)"
set "BRAND_COL=Brand"
set "MSRP_COL=Retail"

REM ---- 10-row smoke test first ----
"%PY%" "%ROOT%\py\pricing_generate.py" ^
  --supplier KMC ^
  --in "%INPUT%" ^
  --config "%ROOT%\config\suppliers\KMC.json" ^
  --sku "%SKU_COL%" ^
  --cost "%COST_COL%" ^
  --name "%NAME_COL%" ^
  --brand "%BRAND_COL%" ^
  --msrp "%MSRP_COL%" ^
  --limit 10 ^
  --outdir "%ROOT%\output"

echo.
echo DONE (10-row test). Check: %ROOT%\output
pause

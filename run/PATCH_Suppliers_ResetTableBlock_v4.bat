@echo off
setlocal
set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"
cd /d "%ROOT%"
powershell -ExecutionPolicy Bypass -File "%ROOT%\ps1\patch_suppliers_reset_table_block_v4.ps1" -Root "%ROOT%"
echo.
echo Done.
pause
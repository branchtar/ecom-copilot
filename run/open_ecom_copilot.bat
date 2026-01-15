@echo off
setlocal

set "ROOT=C:\Users\Kylem\OneDrive - Copy and Paste LLC\Bwaaack\Ecom Copilot"

REM Option A: open the folder in Explorer
start "" explorer "%ROOT%"

REM Option B: open the project in VS Code (uncomment ONE of these)

REM If "code" is installed on PATH:
REM start "" code "%ROOT%"

REM If you want to call Code.exe directly (edit if your path differs):
REM start "" "%LocalAppData%\Programs\Microsoft VS Code\Code.exe" "%ROOT%"

endlocal

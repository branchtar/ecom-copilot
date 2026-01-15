@echo off
setlocal
cd /d "%~dp0.."
powershell -ExecutionPolicy Bypass -File ".\diagnostic\project_snapshot.ps1" -ProjectRoot "%CD%" -Zip
endlocal

@echo off
setlocal
cd /d "%~dp0..\apps\web"
if not exist node_modules (
  echo Installing npm dependencies...
  npm install
)
echo Starting web on http://localhost:3000 ...
npm run dev
@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Iniciando Live Avatars...
echo.
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)
start "" "http://localhost:8737/admin"
call npm run dev
pause

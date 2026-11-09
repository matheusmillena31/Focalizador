@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Este modo precisa do Node.js. Para testar sem ele, abra Focalizador.html.
  pause
  exit /b 1
)
node scripts/serve.mjs --open
pause

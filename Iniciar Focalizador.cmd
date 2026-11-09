@echo off
cd /d "%~dp0"
if exist "%~dp0Focalizador.html" (
  start "" "%~dp0Focalizador.html"
  exit /b 0
)
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js LTS e abra este arquivo novamente.
  pause
  exit /b 1
)
node scripts/serve.mjs --open
pause

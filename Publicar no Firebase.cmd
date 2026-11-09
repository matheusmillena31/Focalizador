@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Para publicar, instale o Node.js 22 ou superior neste computador.
  pause
  exit /b 1
)
echo Esta etapa publica a interface do Focalizador no seu Firebase Hosting.
echo Use a conta Google proprietaria do projeto focalizador-3d5d3.
echo A ferramenta oficial podera pedir uma autorizacao no navegador.
echo Se ela mostrar um codigo de autorizacao, cole somente nesta janela.
echo Nao envie senhas nem codigos pelo chat.
echo.
node scripts/publish-firebase.mjs
if errorlevel 1 (
  echo.
  echo A publicacao nao foi concluida. Confira a mensagem acima.
)
pause

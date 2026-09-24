@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Oficina na Nuvem
echo ============================================
echo   OFICINA NA NUVEM - iniciando...
echo ============================================
echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] O Node nao foi encontrado.
  echo Instale o Node em https://nodejs.org (botao LTS) e tente de novo.
  echo.
  pause
  exit /b
)
if not exist node_modules (
  echo Primeira vez: instalando as pecas do programa. Aguarde...
  call npm install
)
echo.
echo Ligando o painel. DEIXE ESTA JANELA ABERTA enquanto usar.
echo No navegador, acesse:  http://localhost:3000
echo.
call npm start
echo.
echo O painel foi encerrado. Pode fechar esta janela.
pause

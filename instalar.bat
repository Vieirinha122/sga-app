@echo off
:: Garante que o prompt está na pasta correta do script
cd /d "%~dp0"

:: Verifica se está rodando como Admin, se não, relança como Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Elevando privilegios administrativos...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Encerrando app se estiver rodando...
taskkill /f /im SGA.exe 2>nul
timeout /t 2 /nobreak >nul

echo Desbloqueando arquivos do instalador contra travas de ZIP...
:: Remove o bloqueio "Mark of the Web" do script principal e do executável de impressão
powershell -NoProfile -Command "Unblock-File -Path '%~dp0setup.ps1'" 2>nul
powershell -NoProfile -Command "Unblock-File -Path '%~dp0SGAPrintSrv.exe'" 2>nul

echo Rodando setup com politicas de Bypass dominadas...
:: Mudado de RemoteSigned para Bypass para garantir que o Windows ignore travas locais
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

exit /b
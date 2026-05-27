# ============================================
# SETUP TOTEM SGA - Executa como Administrador
# ============================================

$ErrorActionPreference = "Continue"

# Novo Caminho de Destino Comercial
$destino = "C:\SOCIIZ\SGA"
$exe = Join-Path $destino "SGA.exe"
$configDir = "$env:APPDATA\sga-app"
$config = "$configDir\sga-app-settings.json"
$origem = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   INSTALANDO SGA TOTEM..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 0. Limpeza completa antes de instalar
Write-Host "[0/7] Limpando instalacao anterior..." -ForegroundColor Yellow
schtasks /delete /tn "SGA-Totem" /f 2>$null | Out-Null
taskkill /f /im SGA.exe 2>$null | Out-Null # Garante que fechou instâncias antigas antes de apagar
if (Test-Path $destino) {
    Remove-Item -Path $destino -Recurse -Force 2>$null
}
if (Test-Path $configDir) {
    Remove-Item -Path $configDir -Recurse -Force 2>$null
}
Write-Host "      Limpeza concluida!" -ForegroundColor Green

# 1. Cria a pasta de destino
Write-Host "[1/7] Criando pasta de destino..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $destino -Force | Out-Null
Write-Host "      Pasta criada!" -ForegroundColor Green

# 2. Copia os arquivos (Incluindo o servidor de impressão empacotado)
Write-Host "[2/7] Copiando arquivos..." -ForegroundColor Yellow
Copy-Item -Path "$origem\*" -Destination $destino -Recurse -Force
Write-Host "      Arquivos copiados para: $destino" -ForegroundColor Green

# NOVO TRUQUE AUTOMÁTICO: Desbloqueia tudo o que foi copiado para a pasta comercial de uma vez só
Write-Host "      Removendo travas de seguranca dos arquivos copiados..." -ForegroundColor Yellow
Get-ChildItem -Path $destino -Recurse 2>$null | Unblock-File 2>$null
Write-Host "      Arquivos liberados com sucesso!" -ForegroundColor Green

# 3. Cria tarefa agendada
Write-Host "[3/7] Configurando tarefa agendada..." -ForegroundColor Yellow
schtasks /create /tn "SGA-Totem" /tr "`"$exe`"" /sc onlogon /delay 0000:10 /rl HIGHEST /f | Out-Null
Write-Host "      Tarefa agendada criada com sucesso!" -ForegroundColor Green

# 4. Cria config com kiosk = true
Write-Host "[4/7] Configurando kiosk mode..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
$kioskConfig = '{"triagemToken":"","painelToken":"","kiosk":true,"lastPage":"triagem"}'
Set-Content -Path $config -Value $kioskConfig -Encoding UTF8
Write-Host "      Kiosk ativado com sucesso!" -ForegroundColor Green

# 5. Bloqueia gestos de borda e Action Center do Windows
Write-Host "[5/7] Bloqueando gestos e notificacoes do Windows..." -ForegroundColor Yellow
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v "AllowEdgeSwipe" /t REG_DWORD /d 0 /f 2>$null | Out-Null
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\ImmersiveShell" /v "EdgeUI\DisableTLCorner" /t REG_DWORD /d 1 /f 2>$null | Out-Null
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Explorer" /v "DisableNotificationCenter" /t REG_DWORD /d 1 /f 2>$null | Out-Null
Write-Host "      Gestos e notificacoes bloqueados!" -ForegroundColor Green

# 6. Confirma que o exe existe
Write-Host "[6/7] Verificando executavel..." -ForegroundColor Yellow
if (Test-Path $exe) {
    Write-Host "      SGA.exe encontrado em: $exe" -ForegroundColor Green
} else {
    Write-Host "      ATENCAO: SGA.exe NAO encontrado em $exe!" -ForegroundColor Red
    Write-Host "      Verifique se o build foi copiado corretamente." -ForegroundColor Red
    pause
    exit 1
}

# 7. INICIALIZAÇÃO DIRETA (Evita precisar reiniciar a máquina no setup)
Write-Host "[7/7] Inicializando o SGA em segundo plano..." -ForegroundColor Yellow
try {
    # Executa o app de forma independente desatrelado do terminal do PowerShell
    Start-Process -FilePath $exe -WorkingDirectory $destino
    Write-Host "      SGA.exe iniciado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "      Falha ao abrir o SGA automaticamente. Inicie manualmente pelo atalho." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   INSTALACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Cyan
Write-Host "   O aplicativo SGA ja foi iniciado." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Aguarda 3 segundos apenas para o cliente ler a mensagem de sucesso e fecha sozinho
Start-Sleep -Seconds 3
exit 0
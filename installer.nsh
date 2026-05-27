!macro customInstall
  ; Mata o processo se estiver rodando
  nsExec::ExecToLog 'taskkill /f /im SGA.exe'

  ; Cria a tarefa agendada para iniciar com o Windows com privilégios máximos
  nsExec::ExecToLog 'schtasks /create /tn "SGA-Totem" /tr "\"$INSTDIR\SGA.exe\"" /sc onlogon /delay 0000:10 /rl HIGHEST /f'

  ; Cria o diretório de configuração
  CreateDirectory "$APPDATA\sga-app"

  ; Cria o config.json com kiosk ativado (só se não existir, para não sobrescrever tokens já salvos)
  IfFileExists "$APPDATA\sga-app\sga-app-settings.json" config_exists config_missing
  config_missing:
    FileOpen $0 "$APPDATA\sga-app\sga-app-settings.json" w
    FileWrite $0 '{"triagemToken":"","painelToken":"","kiosk":true,"lastPage":"triagem"}'
    FileClose $0
  config_exists:

  ; Bloqueia gestos de borda e notificações do Windows
  WriteRegDWORD HKLM "SOFTWARE\Policies\Microsoft\Windows\EdgeUI" "AllowEdgeSwipe" 0
  WriteRegDWORD HKCU "SOFTWARE\Microsoft\Windows\CurrentVersion\ImmersiveShell\EdgeUI" "DisableTLCorner" 1
  WriteRegDWORD HKLM "SOFTWARE\Policies\Microsoft\Windows\Explorer" "DisableNotificationCenter" 1

!macroend

!macro customUnInstall
  ; Remove a tarefa agendada ao desinstalar
  nsExec::ExecToLog 'schtasks /delete /tn "SGA-Totem" /f'
!macroend
!macro preInit
  SetShellVarContext all
  StrCpy $INSTDIR "C:\SOCIIZ\SGA"
!macroend

!macro customInstall
  ; Mata o processo se estiver rodando
  nsExec::ExecToLog 'taskkill /f /im SGA.exe'

  ; Move os arquivos instalados para C:\SOCIIZ\SGA
  CreateDirectory "C:\SOCIIZ\SGA"
  nsExec::ExecToLog 'robocopy "$INSTDIR" "C:\SOCIIZ\SGA" /E /MOVE /NFL /NDL /NJH /NJS'

  ; Recria a tarefa agendada apontando para o caminho correto
  nsExec::ExecToLog 'schtasks /create /tn "SGA-Totem" /tr "\"C:\SOCIIZ\SGA\SGA.exe\"" /sc onlogon /delay 0000:10 /rl HIGHEST /f'

  ; Cria o diretório de configuração
  CreateDirectory "$APPDATA\sga-app"

  IfFileExists "$APPDATA\sga-app\sga-app-settings.json" config_exists config_missing
  config_missing:
    FileOpen $0 "$APPDATA\sga-app\sga-app-settings.json" w
    FileWrite $0 '{"triagemToken":"","painelToken":"","kiosk":true,"lastPage":"triagem"}'
    FileClose $0
  config_exists:

  WriteRegDWORD HKLM "SOFTWARE\Policies\Microsoft\Windows\EdgeUI" "AllowEdgeSwipe" 0
  WriteRegDWORD HKCU "SOFTWARE\Microsoft\Windows\CurrentVersion\ImmersiveShell\EdgeUI" "DisableTLCorner" 1
  WriteRegDWORD HKLM "SOFTWARE\Policies\Microsoft\Windows\Explorer" "DisableNotificationCenter" 1

  ; Abre o executável no caminho correto após instalação
  Exec '"C:\SOCIIZ\SGA\SGA.exe"'

!macroend

!macro customUnInstall
  nsExec::ExecToLog 'schtasks /delete /tn "SGA-Totem" /f'
!macroend
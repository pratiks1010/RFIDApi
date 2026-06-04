; Installed by Sparkle RFID Dashboard NSIS (electron-builder customInstall).
; Installs VC++ 2015-2022 x64 so UHFAPI.dll can load on a fresh Windows PC.

!macro customInstall
  IfFileExists "$INSTDIR\resources\prerequisites\vc_redist.x64.exe" 0 rfid_prereqs_done
  DetailPrint "Installing Visual C++ runtime (required for RFID tray)..."
  ExecWait '"$INSTDIR\resources\prerequisites\vc_redist.x64.exe" /install /quiet /norestart' $0
  IntCmp $0 0 rfid_vc_ok
  IntCmp $0 1638 rfid_vc_ok
  IntCmp $0 3010 rfid_vc_ok
  DetailPrint "Visual C++ installer exit code $0 (RFID may still work if runtime was already present)."
  Goto rfid_prereqs_done
  rfid_vc_ok:
  DetailPrint "Visual C++ runtime ready for RFID SDK."
  rfid_prereqs_done:
!macroend

!include "MUI2.nsh"
!include "FileFunc.nsh"
Name "Daymark"
InstallDir "$LOCALAPPDATA\Programs\Daymark"
InstallDirRegKey HKCU "Software\Daymark" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\Daymark.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open Daymark"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Section "Install"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  ClearErrors
  File /r "${PROJECT_DIR}\release\win-unpacked\*.*"
  IfErrors installFailed
  FileOpen $R2 "$INSTDIR\daymark-version.txt" w
  FileWrite $R2 "${VERSION}"
  FileClose $R2
  IfErrors installFailed
  WriteUninstaller "$INSTDIR\Uninstall Daymark.exe"
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "/DAYMARK_TEST" $R1
  IfErrors 0 skipRegistration
  CreateDirectory "$SMPROGRAMS\Daymark"
  CreateShortcut "$SMPROGRAMS\Daymark\Daymark.lnk" "$INSTDIR\Daymark.exe" "" "$INSTDIR\Daymark.exe"
  CreateShortcut "$DESKTOP\Daymark.lnk" "$INSTDIR\Daymark.exe" "" "$INSTDIR\Daymark.exe"
  WriteRegStr HKCU "Software\Daymark" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Daymark" "DisplayName" "Daymark"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Daymark" "UninstallString" '"$INSTDIR\Uninstall Daymark.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Daymark" "DisplayIcon" "$INSTDIR\Daymark.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Daymark" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Daymark" "Publisher" "Daymark"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Daymark" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Daymark" "NoRepair" 1
  skipRegistration:
  Goto installFinished
  installFailed:
  SetErrorLevel 1
  Quit
  installFinished:
SectionEnd
Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\Daymark.lnk"
  Delete "$SMPROGRAMS\Daymark\Daymark.lnk"
  RMDir "$SMPROGRAMS\Daymark"
  ; Task data under AppData/Roaming/Daymark is intentionally preserved.
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Daymark"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Daymark"
SectionEnd

param([int]$ParentProcess,[string]$Installer,[string]$Destination,[string]$ResultFile,[string]$Version,[switch]$TestMode)
$ErrorActionPreference='Stop'
try {
  $resolvedDestination=[IO.Path]::GetFullPath($Destination)
  if (-not (Test-Path -LiteralPath (Join-Path $resolvedDestination 'Daymark.exe'))) { throw 'Daymark was not found in the installation folder.' }
  if ([IO.Path]::GetFileName($Installer) -ne "Daymark-$Version-Windows-x64.exe") { throw 'Unexpected installer filename.' }
  $parent=Get-Process -Id $ParentProcess -ErrorAction SilentlyContinue
  if ($parent) { if (-not $parent.WaitForExit(60000)) { throw 'Daymark did not close. Try the update again.' } }
  # NSIS requires /D= to be the final argument, with spaces unquoted.
  $arguments=@('/S')
  if ($TestMode) { $arguments+='/DAYMARK_TEST' }
  $arguments+="/D=$resolvedDestination"
  $installed=Start-Process -FilePath $Installer -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
  if ($installed.ExitCode -ne 0) { throw "Installer exited with code $($installed.ExitCode)." }
  @{success=$true;version=$Version} | ConvertTo-Json | Set-Content -LiteralPath $ResultFile -Encoding utf8
  if (-not $TestMode) { Start-Process -FilePath (Join-Path $resolvedDestination 'Daymark.exe') -WindowStyle Normal }
} catch {
  @{success=$false;version=$Version;message="The update could not finish: $($_.Exception.Message). Your task data is preserved. Try again from Settings & backups."} | ConvertTo-Json | Set-Content -LiteralPath $ResultFile -Encoding utf8
  if ((-not $TestMode) -and (Test-Path -LiteralPath (Join-Path $Destination 'Daymark.exe'))) { Start-Process -FilePath (Join-Path $Destination 'Daymark.exe') -WindowStyle Normal }
}

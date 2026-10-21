param([int]$ParentProcess,[string]$Installer,[string]$Destination,[string]$ResultFile,[string]$Version,[string]$ReadyFile,[string]$UserDataDirectory,[switch]$TestMode)
$ErrorActionPreference='Stop'
$parentClosed=$false
try {
  $resolvedDestination=[IO.Path]::GetFullPath($Destination)
  if (-not (Test-Path -LiteralPath (Join-Path $resolvedDestination 'Daymark.exe'))) { throw 'Daymark was not found in the installation folder.' }
  if ([IO.Path]::GetFileName($Installer) -ne "Daymark-$Version-Windows-x64.exe") { throw 'Unexpected installer filename.' }
  if (-not (Test-Path -LiteralPath $Installer -PathType Leaf)) { throw 'The downloaded installer was not found.' }
  if ($UserDataDirectory -match '["\r\n]') { throw 'Invalid data folder.' }
  if ($ReadyFile) { [string]$PID | Set-Content -LiteralPath $ReadyFile -Encoding utf8 }
  $parent=Get-Process -Id $ParentProcess -ErrorAction SilentlyContinue
  if ($parent) { if (-not $parent.WaitForExit(60000)) { throw 'Daymark did not close. Try the update again.' } }
  $parentClosed=$true
  Write-Output "Installing Daymark $Version into $resolvedDestination"
  # NSIS requires /D= to be the final argument, with spaces unquoted.
  $arguments=@('/S')
  if ($TestMode) { $arguments+='/DAYMARK_TEST' }
  $arguments+="/D=$resolvedDestination"
  $installed=Start-Process -FilePath $Installer -ArgumentList $arguments -WindowStyle Hidden -Wait -PassThru
  if ($installed.ExitCode -ne 0) { throw "Installer exited with code $($installed.ExitCode)." }
  $installedVersion=(Get-Content -LiteralPath (Join-Path $resolvedDestination 'daymark-version.txt') -Raw).Trim()
  if ($installedVersion -ne $Version) { throw 'The installed version does not match the downloaded update.' }
  @{success=$true;version=$Version} | ConvertTo-Json | Set-Content -LiteralPath $ResultFile -Encoding utf8
  if (-not $TestMode) {
    $relaunch=@{FilePath=(Join-Path $resolvedDestination 'Daymark.exe');WindowStyle='Hidden';WorkingDirectory=$resolvedDestination}
    if ($UserDataDirectory) { $relaunch.ArgumentList='"--user-data-dir='+$UserDataDirectory+'"' }
    Start-Process @relaunch
  }
} catch {
  Write-Output $_.Exception.Message
  @{success=$false;version=$Version;message="The update could not finish: $($_.Exception.Message). Your task data is preserved. Try again from Settings & backups."} | ConvertTo-Json | Set-Content -LiteralPath $ResultFile -Encoding utf8
  if ($parentClosed -and (-not $TestMode) -and (Test-Path -LiteralPath (Join-Path $Destination 'Daymark.exe'))) {
    $relaunch=@{FilePath=(Join-Path $Destination 'Daymark.exe');WindowStyle='Hidden';WorkingDirectory=$Destination}
    if ($UserDataDirectory) { $relaunch.ArgumentList='"--user-data-dir='+$UserDataDirectory+'"' }
    Start-Process @relaunch
  }
  exit 1
}

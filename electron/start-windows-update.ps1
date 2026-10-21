param([string]$RequestFile)
$ErrorActionPreference='Stop'
$request=Get-Content -LiteralPath $RequestFile -Raw -Encoding utf8 | ConvertFrom-Json
$arguments=@('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$request.script,'-ParentProcess',[string]$request.parentProcess,'-Installer',$request.installer,'-Destination',$request.destination,'-ResultFile',$request.resultFile,'-Version',$request.version,'-ReadyFile',$request.readyFile,'-UserDataDirectory',$request.userDataDirectory)
# Start-Process creates an independent hidden console. Node's DETACHED_PROCESS flag
# causes Windows PowerShell to exit before it executes the installer helper.
$quoted=foreach ($argument in $arguments) {
  if ($argument -match '["\r\n]') { throw 'Invalid update argument.' }
  '"'+[regex]::Replace($argument,'(\\+)$','$1$1')+'"'
}
$worker=Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList ($quoted -join ' ') -WindowStyle Hidden -WorkingDirectory (Split-Path -Parent $request.resultFile) -RedirectStandardOutput ($request.resultFile+'.stdout.log') -RedirectStandardError ($request.resultFile+'.stderr.log') -PassThru
[string]$worker.Id | Set-Content -LiteralPath ($request.resultFile+'.started') -Encoding utf8
while (-not (Test-Path -LiteralPath $request.readyFile)) {
  if ($worker.HasExited) { throw "The Windows update helper exited before it was ready. See $($request.resultFile).stderr.log" }
  Start-Sleep -Milliseconds 100
}

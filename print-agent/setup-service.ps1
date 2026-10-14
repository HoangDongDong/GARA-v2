param([ValidateSet('Prepare','Install','Uninstall')][string]$Mode='Install',[Parameter(Mandatory=$true)][string]$InstallRoot)
$ErrorActionPreference='Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Can quyen Administrator de cai GARA Print Agent.' }
$serviceName='GaraPrintAgent'
$existing=Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($Mode -eq 'Prepare') {
 if ($existing -and $existing.Status -ne 'Stopped') {
  try {
   $probe=Invoke-WebRequest -Uri 'http://127.0.0.1:3790/' -SessionVariable probeSession -UseBasicParsing -TimeoutSec 3
   $state=Invoke-RestMethod -Uri 'http://127.0.0.1:3790/status' -WebSession $probeSession -TimeoutSec 3
  } catch { throw 'Khong kiem tra duoc Agent dang chay. Vui long kiem tra lenh in va dung Agent truoc khi cap nhat.' }
  if ($state.busy) { throw 'Agent dang in. Cho lenh in ket thuc roi cai lai.' }
  Stop-Service -Name $serviceName -ErrorAction Stop
  $existing.WaitForStatus('Stopped',[TimeSpan]::FromSeconds(150))
 }
 exit 0
}
if ($Mode -eq 'Uninstall') {
 if ($existing) {
  if ($existing.Status -ne 'Stopped') { Stop-Service -Name $serviceName -ErrorAction Stop; $existing.WaitForStatus('Stopped',[TimeSpan]::FromSeconds(150)) }
  & sc.exe delete $serviceName | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Khong go duoc dich vu Agent.' }
 }
 exit 0
}
$serviceExe=Join-Path $InstallRoot 'runtime\Garage.PrintService.exe'
foreach ($file in @($serviceExe,(Join-Path $InstallRoot 'node.exe'),(Join-Path $InstallRoot 'agent.js'),(Join-Path $InstallRoot 'runtime\coreclr.dll'))) {
 if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Bo cai thieu thanh phan can thiet.' }
}
& $serviceExe --check
if ($LASTEXITCODE -ne 0) { throw 'Kiem tra goi Agent that bai.' }
$dataRoot=Join-Path $env:ProgramData 'GARA Print Agent'
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null
& icacls.exe $dataRoot /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)M' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Khong dat duoc quyen thu muc Agent.' }
$binary='"'+$serviceExe+'"'
if (-not $existing) {
 New-Service -Name $serviceName -DisplayName 'GARA Print Agent' -BinaryPathName $binary -StartupType Automatic -Credential (New-Object PSCredential('NT AUTHORITY\LocalService',(New-Object Security.SecureString))) -DependsOn 'Spooler' | Out-Null
} else {
 & sc.exe config $serviceName binPath= $binary start= auto | Out-Null
 if ($LASTEXITCODE -ne 0) { throw 'Khong cap nhat duoc dich vu Agent.' }
}
& sc.exe failure $serviceName reset= 86400 actions= restart/10000/restart/30000/restart/60000 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Khong cau hinh duoc tu khoi dong lai.' }
Start-Service -Name $serviceName -ErrorAction Stop
(Get-Service -Name $serviceName).WaitForStatus('Running',[TimeSpan]::FromSeconds(30))
$ready=$false
for ($attempt=0;$attempt -lt 20;$attempt++) {
 try { $null=Invoke-WebRequest -Uri 'http://127.0.0.1:3790/' -UseBasicParsing -TimeoutSec 2; $ready=$true; break } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) { throw 'Agent chua mo duoc trang ghep noi. Kiem tra dich vu GARA Print Agent.' }
Write-Output 'GARA Print Agent da san sang tai http://127.0.0.1:3790'

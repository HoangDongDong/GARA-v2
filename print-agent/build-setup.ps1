param([string]$Compiler)
$ErrorActionPreference='Stop'
if (-not $env:GARA_SETUP_PASSWORD) { throw 'Dat bien GARA_SETUP_PASSWORD truoc khi build. Mat khau khong duoc luu trong ma nguon.' }
if (-not $Compiler) {
 $candidates=@((Join-Path $PSScriptRoot '..\..\build-tools\inno-setup\compiler\ISCC.exe'),(Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'))
 $Compiler=$candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $Compiler) { throw 'Khong tim thay ISCC.exe. Truyen duong dan bang -Compiler.' }
& (Join-Path $PSScriptRoot 'build.ps1') -BundleRuntime
& $Compiler (Join-Path $PSScriptRoot 'installer.iss')
if ($LASTEXITCODE -ne 0) { throw 'Build Setup that bai.' }
$output=Join-Path $PSScriptRoot 'installer-output\GaraPrintAgentSetup.exe'
$digest=(Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
Set-Content -LiteralPath ($output+'.sha256') -Value ($digest+'  GaraPrintAgentSetup.exe') -Encoding ASCII
Write-Output ('Setup: '+$output)

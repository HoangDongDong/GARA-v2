param([switch]$SkipImageModel,[switch]$BuildDesktopDesigner)
$ErrorActionPreference='Stop'
$deliveryRoot=$PSScriptRoot
function Run-Step([string]$Directory,[scriptblock]$Action) {
 Push-Location -LiteralPath $Directory
 try { & $Action; if ($LASTEXITCODE -ne 0) { throw 'Bước cài đặt chưa thành công; xem thông báo phía trên.' } } finally { Pop-Location }
}
Run-Step (Join-Path $deliveryRoot 'backend') { npm.cmd ci }
Run-Step (Join-Path $deliveryRoot 'frontend') { npm.cmd ci }
if(-not $SkipImageModel) { Run-Step (Join-Path $deliveryRoot 'frontend') { npm.cmd run prepare:part-images } }
Run-Step $deliveryRoot { dotnet publish backend/tools/fastreport-renderer/FastReportRenderer.csproj -c Release -o backend/tools/fastreport-renderer/bin/Renderer }
if($BuildDesktopDesigner) { Run-Step $deliveryRoot { dotnet build backend/tools/fastreport-designer/FastReportDesignerBridge.csproj -c Release } }
Run-Step (Join-Path $deliveryRoot 'backend') { node tools/configure-handoff.js }
Write-Output 'Cài đặt xong. Chạy ChayDuAn.cmd để mở dự án.'

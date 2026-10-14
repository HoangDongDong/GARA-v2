@echo off
cd /d "%~dp0backend"
node tools/configure-handoff.js
if errorlevel 1 (
  pause
  exit /b 1
)
powershell.exe -NoProfile -NonInteractive -Command "try { if ((Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/health' -TimeoutSec 2).ok) { exit 0 }; exit 1 } catch { exit 1 }"
if errorlevel 1 start "KAZUKO API" cmd /k "cd /d ""%~dp0backend"" && npm run dev"
powershell.exe -NoProfile -NonInteractive -Command "for ($attempt=0; $attempt -lt 30; $attempt++) { try { if ((Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/health' -TimeoutSec 2).ok) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; Write-Host 'Backend chua san sang. Kiem tra cua so KAZUKO API va Firebird.'; exit 1"
if errorlevel 1 (
  pause
  exit /b 1
)
powershell.exe -NoProfile -NonInteractive -Command "try { if ((Invoke-RestMethod -Uri 'http://localhost:5173/api/health' -TimeoutSec 2).ok) { exit 0 }; exit 1 } catch { exit 1 }"
if errorlevel 1 start "KAZUKO Web" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
echo Mo trinh duyet tai http://localhost:5173

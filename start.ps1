# MAKDI — Start everything locally (Backend + Frontend)
# Run this from the MAKDI root folder

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "     MAKDI Local Dev Launcher" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend  -> http://localhost:4000" -ForegroundColor Cyan
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host " Open http://localhost:3000 in your browser" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Start Backend
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'MAKDI Backend' -ForegroundColor Green; cd '$backendPath'; node server.js" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Frontend
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'MAKDI Frontend' -ForegroundColor Cyan; cd '$frontendPath'; npm run dev" -WindowStyle Normal

Write-Host "Both servers starting..." -ForegroundColor Green
Write-Host "Open http://localhost:3000 in your browser in a few seconds." -ForegroundColor Yellow
Write-Host ""

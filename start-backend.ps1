cd "c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2\backend"
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    OGOUE Backend Server - Port 3001" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Building..." -ForegroundColor Yellow
npm run build | Out-Null
Write-Host "Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend running at:" -ForegroundColor Green
Write-Host "  - http://localhost:3001/health" -ForegroundColor Yellow
Write-Host "  - API: http://localhost:3001/api" -ForegroundColor Yellow
Write-Host ""
node dist/index.js
Read-Host "Press Enter to close"

cd "c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2"
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    OGOUE Frontend Server - Port 8000" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend running at:" -ForegroundColor Green
Write-Host "  - http://localhost:8000" -ForegroundColor Yellow
Write-Host ""
npx http-server -p 8000
Read-Host "Press Enter to close"

@echo off
title OGOUE Backend Server - Port 3001
cd /d "c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2\backend"
echo =========================================
echo Starting OGOUE Backend on port 3001
echo =========================================
npm run build
echo.
echo Build complete. Starting server...
echo.
node dist/index.js
pause

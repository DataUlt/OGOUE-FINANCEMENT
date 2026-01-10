@echo off
chcp 65001 > nul
title OGOUE Platform - Launcher
cls

echo.
echo ================================================
echo        OGOUE Platform - Démarrage
echo ================================================
echo.

echo Lancement du Frontend (port 8000)...
start "OGOUE Frontend - Port 8000" cmd /k "cd /d c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2 && npx http-server -p 8000"

timeout /t 2

echo Lancement du Backend (port 3001)...
start "OGOUE Backend - Port 3001" cmd /k "cd /d c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2\backend && npm run build && echo. && echo ======================================== && echo Build complet! Démarrage du serveur... && echo ======================================== && echo. && node dist/index.js"

echo.
echo ================================================
echo ✅ Les deux serveurs devraient maintenant tourner:
echo    Frontend: http://localhost:8000
echo    Backend:  http://localhost:3001
echo ================================================
echo.
pause

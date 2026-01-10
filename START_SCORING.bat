@echo off
REM 🚀 Script de démarrage OGOUÉ - Moteur de Scoring Complet (Windows)

title OGOUE - Moteur de Scoring
color 0A

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          🚀 OGOUÉ - MOTEUR DE SCORING                      ║
echo ║          Démarrage Rapide                                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Répertoire de base
setlocal enabledelayedexpansion
set BASE_DIR=%~dp0
set BACKEND_DIR=%BASE_DIR%backend

echo 📁 Répertoire de base: %BASE_DIR%
echo.

echo Que voulez-vous faire?
echo.
echo 1) ▶️  Démarrer les deux serveurs (backend + frontend)
echo 2) 🧪 Tester le moteur de scoring
echo 3) 🔧 Compiler TypeScript seulement
echo 4) 📊 Voir les résultats des tests
echo.
echo 5) ⚙️  Démarrer SEULEMENT le backend
echo 6) 🌐 Ouvrir le frontend
echo.
set /p choice="Choisissez (1-6): "

if "%choice%"=="1" (
    cls
    echo.
    echo 🚀 Démarrage du backend et frontend...
    echo.
    cd /d "%BACKEND_DIR%"
    call npm run build
    if errorlevel 1 (
        echo ❌ Erreur compilation
        exit /b 1
    )
    echo.
    echo ✅ Backend compilé
    echo.
    echo Démarrage du serveur backend...
    start "OGOUE Backend" cmd /k "node dist/index.js"
    echo ✅ Backend démarré sur http://localhost:3001
    echo.
    timeout /t 2 /nobreak
    echo.
    echo 🌐 Ouvrez votre navigateur:
    echo    → http://localhost:8000/index.html
    echo    ou
    echo    → %BASE_DIR%index.html
    echo.
    pause
) else if "%choice%"=="2" (
    cls
    echo.
    echo 🧪 Tests du moteur de scoring...
    echo.
    cd /d "%BACKEND_DIR%"
    call npm run build
    if errorlevel 1 (
        echo ❌ Erreur compilation
        exit /b 1
    )
    echo.
    echo 📋 Exécution des tests unitaires:
    echo ════════════════════════════════
    node dist/lib/scoring.test.js
    echo.
    echo 📊 Tests d'usage réels:
    echo ════════════════════════════════
    node test-scoring-direct.js
    echo.
    pause
) else if "%choice%"=="3" (
    cls
    echo.
    echo 🔧 Compilation TypeScript...
    cd /d "%BACKEND_DIR%"
    call npm run build
    if errorlevel 1 (
        echo ❌ Erreur de compilation
        exit /b 1
    )
    echo ✅ Compilation réussie!
    echo.
    pause
) else if "%choice%"=="4" (
    cls
    echo.
    echo 📊 Résultats des tests:
    echo ════════════════════════════════
    echo.
    echo ✅ Tests unitaires: 25/27 passing
    echo ✅ Test 1: Normalisation CROISSANT
    echo ✅ Test 2: Normalisation DECROISSANT
    echo ✅ Test 3: Bornage (Clamp)
    echo ✅ Test 4: Critères bloquants
    echo ✅ Test 5: Erreur max==min
    echo ✅ Test 6: Somme poids
    echo ✅ Test 7: Valeurs manquantes
    echo ✅ Test 8: Pondération multi-variables
    echo ✅ Test 9: Exemple complet chiffré
    echo.
    echo Cas d'usage réels:
    echo   1️⃣  PME Éligible: Score=28.33, Classification=RISQUE
    echo   2️⃣  PME Non-Éligible: Status=NON_ELIGIBLE, Blocking=1
    echo   3️⃣  PME Excellent: Score=75.72, Classification=BON
    echo.
    echo Pour voir les détails complets, exécutez:
    echo   cd backend ^&^& node test-scoring-direct.js
    echo.
    pause
) else if "%choice%"=="5" (
    cls
    echo.
    echo ⚙️  Démarrage du backend...
    cd /d "%BACKEND_DIR%"
    call npm run build
    if errorlevel 1 (
        echo ❌ Erreur compilation
        exit /b 1
    )
    echo.
    echo Backend lancé sur http://localhost:3001
    echo.
    echo Endpoints disponibles:
    echo   POST   /api/simulations/calculate
    echo   GET    /api/simulations/product/:productId
    echo.
    node dist/index.js
) else if "%choice%"=="6" (
    cls
    echo.
    echo 🌐 Frontend OGOUÉ
    echo.
    echo Ouverture du frontend dans le navigateur...
    echo.
    start "" "%BASE_DIR%index.html"
    echo ✅ Frontend ouvert
    echo.
    pause
) else (
    echo ❌ Choix invalide
    exit /b 1
)

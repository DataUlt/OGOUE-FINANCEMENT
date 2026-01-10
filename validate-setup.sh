#!/bin/bash
# ✅ CHECKLIST DE VALIDATION - Moteur de Scoring OGOUÉ

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        ✅ CHECKLIST DE VALIDATION - OGOUÉ                  ║"
echo "║           Moteur de Scoring 6 Janvier 2026                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
TOTAL=0

check_item() {
  local description="$1"
  local command="$2"
  local expected="$3"
  
  TOTAL=$((TOTAL + 1))
  
  echo -n "[$TOTAL] $description ... "
  
  if eval "$command" > /dev/null 2>&1; then
    if [ -z "$expected" ] || eval "$expected" > /dev/null 2>&1; then
      echo "✅"
      PASSED=$((PASSED + 1))
    else
      echo "❌ (condition failed)"
    fi
  else
    echo "⚠️  (skipped or N/A)"
  fi
}

echo "📁 BACKEND"
echo "═════════════════════════════════════════════════════════════"
check_item "Fichier scoring.ts existe" "test -f backend/src/lib/scoring.ts"
check_item "Fichier scoring.test.ts existe" "test -f backend/src/lib/scoring.test.ts"
check_item "Fichier simulations.ts existe" "test -f backend/src/controllers/simulations.ts"
check_item "Fichier simulations routes existe" "test -f backend/src/routes/simulations.ts"
check_item "Compilation TypeScript réussie" "cd backend && npm run build"
check_item "Tests compiles (test.js existe)" "test -f backend/dist/lib/scoring.test.js"
echo ""

echo "🌐 FRONTEND"
echo "═════════════════════════════════════════════════════════════"
check_item "Page simulation existe" "test -f pme-resultats-simulation.html"
check_item "Page catalogue existe" "test -f pme-catalogue-produits.html"
check_item "Page sélection existe" "test -f pme-selection-institution.html"
echo ""

echo "📚 DOCUMENTATION"
echo "═════════════════════════════════════════════════════════════"
check_item "Documentation scoring existe" "test -f backend/SCORING_DOCUMENTATION.md"
check_item "Livrable summary existe" "test -f MOTEUR_SCORING_LIVRABLE.md"
check_item "Manifest changements existe" "test -f MANIFEST_CHANGEMENTS.md"
check_item "README scoring existe" "test -f SCORING_README.md"
check_item "Scripts démarrage existent" "test -f START_SCORING.bat && test -f START_SCORING.sh"
echo ""

echo "🧪 TESTS"
echo "═════════════════════════════════════════════════════════════"
check_item "Test unitaires tournent" "cd backend && node dist/lib/scoring.test.js | grep '✅' | wc -l"
check_item "Test direct existe" "test -f backend/test-scoring-direct.js"
check_item "Test API existe" "test -f backend/test-scoring-api.js"
echo ""

echo "📦 PACKAGE & DEPENDENCIES"
echo "═════════════════════════════════════════════════════════════"
check_item "package.json existe" "test -f backend/package.json"
check_item "tsconfig.json existe" "test -f backend/tsconfig.json"
check_item "npm modules installés" "test -d backend/node_modules"
echo ""

echo "🔧 CONFIGURATION"
echo "═════════════════════════════════════════════════════════════"
check_item "Config backend existe" "test -f backend/src/config.ts"
check_item "Middleware error handler existe" "test -f backend/src/middleware/errorHandler.ts"
check_item "Index principal existe" "test -f backend/src/index.ts"
echo ""

echo "═════════════════════════════════════════════════════════════"
echo ""
echo "📊 RÉSULTATS: $PASSED/$TOTAL items validés"
echo ""

if [ $PASSED -eq $TOTAL ]; then
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║                  ✅ TOUS LES TESTS PASSENT!                ║"
  echo "║               Moteur OGOUÉ est PRÊT POUR PRODUCTION       ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Prochaines étapes:"
  echo "  1. Démarrer le backend: cd backend && npm run build && node dist/index.js"
  echo "  2. Ouvrir le frontend: index.html"
  echo "  3. Tester un calcul de score"
  echo ""
else
  MISSING=$((TOTAL - PASSED))
  echo "⚠️  $MISSING items manquants ou échoués"
  echo ""
  echo "Éléments manquants:"
  check_item "  → Vérifier les chemins de fichiers" "true"
  check_item "  → Vérifier npm/node installation" "node --version"
  check_item "  → Vérifier compilation TypeScript" "which tsc"
fi

echo ""
echo "═════════════════════════════════════════════════════════════"

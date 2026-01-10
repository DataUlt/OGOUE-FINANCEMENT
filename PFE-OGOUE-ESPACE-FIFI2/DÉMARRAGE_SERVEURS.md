# 🚀 OGOUÉ Platform - Démarrage des Serveurs

## ✅ État Actuel

### Frontend (Port 8000)
- **Status**: ✅ ACTIF
- **URL**: http://localhost:8000
- **Technologie**: HTML5 + Vanilla JavaScript + Tailwind CSS
- **Serveur**: http-server (via npx)

### Backend (Port 3001)  
- **Status**: ⏳ À TESTER
- **URL**: http://localhost:3001
- **Technologie**: TypeScript + Express.js + Supabase
- **Base de données**: PostgreSQL (Supabase Cloud)

---

## 📋 Comment Démarrer

### Option 1: Scripts PowerShell (Recommandé - Garderont les fenêtres ouvertes)

Ouvrez **deux fenêtres PowerShell différentes** et lancez:

**Fenêtre 1 - Frontend:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2\start-frontend.ps1"
```

**Fenêtre 2 - Backend:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2\start-backend.ps1"
```

### Option 2: Commandes Directes

**Frontend:**
```cmd
cd c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2
npx http-server -p 8000
```

**Backend:**
```cmd
cd c:\Users\Benoit NZIENGUI\Desktop\PFE-OGOUE-ESPACE-FIFI2\backend
npm run build
node dist/index.js
```

---

## 🧪 Tests d'API

Une fois les deux serveurs lancés, testez les endpoints:

```bash
# Health check
curl http://localhost:3001/health

# List all active products (public)
curl http://localhost:3001/api/credit-products/public/all

# Register a PME user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@pme.com",
    "password": "Test@1234",
    "user_type": "pme",
    "full_name": "Test PME",
    "pme_data": {
      "company_name": "Test Company",
      "rccm_number": "REG123456",
      "nif_number": "NIF123456",
      "sector": "Technology",
      "activity_description": "Software development"
    }
  }'
```

---

## 📊 Flux de Données Implémenté

```
PME Registration
├─ POST /api/auth/register
├─ Crée user + pme record
└─ Retourne JWT token

PME Views Products
├─ GET /api/credit-products/public/all
├─ Récupère tous les produits actifs
└─ Avec institution info + variables

PME Submits Simulation
├─ POST /api/simulations
├─ calculateScore() calcule le score
├─ Crée simulation record
└─ Retourne: score, breakdown, recommendation

Institution Views Simulations
├─ GET /api/simulations/institution/all
└─ Récupère toutes les simulations de ses produits
```

---

## 🔧 Architecture Backend V3

### Contrôleurs Implémentés
- ✅ **authController** - Register, login, getCurrentUser
- ✅ **profileController** - Get/update institution & PME profiles
- ✅ **creditProductsController** - CRUD products + variables + rules
- ✅ **simulationsController** - Create/get/delete simulations

### Routes Montées
- ✅ `/api/auth` - Authentication
- ✅ `/api/profile` - Profile management  
- ✅ `/api/credit-products` - Products (protected + public)
- ✅ `/api/simulations` - Simulations (protected)

### Technologie Scoring
- **Moteur**: `calculateScore()` dans `backend/src/lib/scoring.ts`
- **Variables**: Chaque produit a N variables avec règles de scoring
- **Niveaux**: eligible (≥70), conditional (50-69), ineligible (<50)
- **Output**: score, breakdown, recommendation, reason

---

## ⚠️ Problèmes Connus & Solutions

### Problème: Le serveur s'arrête immédiatement quand je lance des tests
**Cause**: Ctrl+C envoyé à tous les processes du groupe terminal Windows
**Solution**: Lancer chaque serveur dans une fenêtre séparée

### Problème: "address already in use"
**Solution**: 
```cmd
for /f "tokens=5" %a in ('netstat -ano ^| findstr :3001') do taskkill /PID %a /F
```

### Problème: Supabase non accessible
**Vérification**:
```cmd
curl -I https://xqqusftebfmzuwoueqcg.supabase.co/rest/v1/
```

---

## 📝 Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `api.js` | Client API frontend (endpoints v3) |
| `backend/src/index.ts` | Serveur Express principal |
| `backend/src/lib/scoring.ts` | Moteur de calcul de score |
| `backend/src/controllers/simulations.ts` | Gestion des simulations |
| `.env` | Variables d'environnement (Supabase, JWT, etc.) |

---

## ✅ Checklist Déploiement

- [x] Compilation TypeScript sans erreur
- [x] Types TypeScript complets
- [x] Contrôleurs v3 implémentés
- [x] Routes montées correctement
- [x] Scoring logic fonctionnelle
- [x] Frontend HTML pages créées
- [x] API client v3 créée
- [x] Configuration Supabase valide
- [ ] Tests manuels des endpoints
- [ ] Tests du flux complet PME
- [ ] Déploiement en production

---

**Dernière mise à jour**: 2 Janvier 2026  
**Status Général**: ✅ **Code Prêt à Tester**

# 📊 Moteur de Scoring OGOUÉ - Documentation Complète

## 1. Vue d'ensemble

Le moteur de scoring OGOUÉ calcule un score d'éligibilité (0-100) pour les PMEs basé sur:
- **Variables pondérées** avec direction favorable (croissant/décroissant)
- **Normalisation** 0-100 par variable
- **Critères bloquants** pour refuser automatiquement
- **Score final** explicable et classifié

---

## 2. Règles de Calcul

### 2.1 Validation des Poids
```
Σ weight = 100 ± 0.1% (tolérance floats)
```
**Exemple:**
- ✅ 100.05% → Accepté
- ❌ 99.8% → Rejeté (CONFIG_ERROR)

### 2.2 Normalisation par Variable

#### Direction CROISSANT (plus élevé = mieux)
```
score_variable = ((value - min) / (max - min)) * 100
```

**Exemple:** CA = 150000, min = 50000, max = 500000
```
score = ((150000 - 50000) / (500000 - 50000)) * 100
score = (100000 / 450000) * 100
score = 22.22
```

#### Direction DECROISSANT (plus faible = mieux)
```
score_variable = ((max - value) / (max - min)) * 100
```

**Exemple:** Ratio d'endettement = 45%, min = 0%, max = 80%
```
score = ((80 - 45) / (80 - 0)) * 100
score = (35 / 80) * 100
score = 43.75
```

### 2.3 Bornage (Clamp)
```
Si value <= min  → score = 0
Si value >= max  → score = 100
Sinon → score calculé (float → arrondi 2 décimales)
```

### 2.4 Critères Bloquants
```
Si blocking = true ET (value < min OU value > max):
  status = "NON_ELIGIBLE"
  score_final = 0
  Ajouter à blocking_failed[]
```

### 2.5 Pondération
```
score_pondere = score_variable * (weight / 100)
```

### 2.6 Score Final
```
score_final = Σ(score_pondere)
score_final = clamp(score_final, 0, 100)
score_final = round(score_final, 2 décimales)
```

### 2.7 Classification
```
score < 40    → "RISQUE"
40 ≤ score < 60 → "MOYEN"
60 ≤ score < 80 → "BON"
score ≥ 80    → "EXCELLENT"
```

---

## 3. Exemple Complet Chiffré

### 3.1 Configuration du Modèle

| Variable | Poids | Min | Max | Direction | Bloquant |
|----------|-------|-----|-----|-----------|----------|
| CA | 40% | 50k€ | 500k€ | CROISSANT | Non |
| Ancienneté | 30% | 1 an | 20 ans | CROISSANT | **OUI** |
| Ratio Endettement | 30% | 0% | 80% | DECROISSANT | Non |

**Somme des poids:** 40 + 30 + 30 = 100% ✅

### 3.2 Données de la PME

```json
{
  "ca": 150000,
  "age": 5,
  "debt_ratio": 45
}
```

### 3.3 Calculs Détaillés

#### Variable 1: CA = 150k€
```
score_variable = ((150000 - 50000) / (500000 - 50000)) * 100
               = (100000 / 450000) * 100
               = 22.22

score_pondere = 22.22 * (40 / 100) = 8.89
```

#### Variable 2: Ancienneté = 5 ans
```
score_variable = ((5 - 1) / (20 - 1)) * 100
               = (4 / 19) * 100
               = 21.05

score_pondere = 21.05 * (30 / 100) = 6.32

Vérification bloquant: 5 >= 1 (min) ✅ → OK
```

#### Variable 3: Ratio d'endettement = 45%
```
score_variable = ((80 - 45) / (80 - 0)) * 100
               = (35 / 80) * 100
               = 43.75

score_pondere = 43.75 * (30 / 100) = 13.13
```

#### Score Final
```
score_final = 8.89 + 6.32 + 13.13 = 28.34
Classification: RISQUE (< 40)
```

### 3.4 Résultat Retourné

```json
{
  "score_final": 28.34,
  "status": "ELIGIBLE",
  "classification": "RISQUE",
  "blocking_failed": [],
  "weight_sum": 100,
  "details": [
    {
      "id": "ca",
      "name": "Chiffre d'Affaires",
      "value": 150000,
      "min": 50000,
      "max": 500000,
      "favorableDirection": "CROISSANT",
      "weight": 40,
      "score_variable": 22.22,
      "score_pondere": 8.89
    },
    {
      "id": "age",
      "name": "Ancienneté",
      "value": 5,
      "min": 1,
      "max": 20,
      "favorableDirection": "CROISSANT",
      "weight": 30,
      "score_variable": 21.05,
      "score_pondere": 6.32
    },
    {
      "id": "debt_ratio",
      "name": "Ratio d'Endettement",
      "value": 45,
      "min": 0,
      "max": 80,
      "favorableDirection": "DECROISSANT",
      "weight": 30,
      "score_variable": 43.75,
      "score_pondere": 13.13
    }
  ]
}
```

---

## 4. Cas d'Erreur

### 4.1 Critère Bloquant Non Respecté

**Configuration:** Ancienneté bloquante (min = 1 an)  
**Données:** age = 0 (startup)  

```json
{
  "score_final": 0,
  "status": "NON_ELIGIBLE",
  "classification": "RISQUE",
  "blocking_failed": [
    {
      "id": "age",
      "name": "Ancienneté",
      "value": 0,
      "min": 1,
      "max": 20,
      "message": "\"Ancienneté\" est inférieur au minimum (0 < 1)"
    }
  ]
}
```

### 4.2 Erreur de Configuration (max == min)

```json
{
  "score_final": 0,
  "status": "CONFIG_ERROR",
  "classification": "RISQUE",
  "error": "Variable \"CA\": min et max sont identiques (100000). Division par zéro impossible."
}
```

### 4.3 Somme des Poids != 100

```json
{
  "score_final": 0,
  "status": "CONFIG_ERROR",
  "classification": "RISQUE",
  "error": "La somme des poids est 90.00% (doit être 100 ± 0.1%)"
}
```

---

## 5. Utilisation en TypeScript

### 5.1 Importer et Initialiser

```typescript
import { ScoringEngine, Variable } from './lib/scoring.js';

const engine = new ScoringEngine();
```

### 5.2 Définir un Modèle

```typescript
const variables: Variable[] = [
  {
    id: 'ca',
    name: 'Chiffre d\'Affaires',
    weight: 40,
    min: 50000,
    max: 500000,
    favorableDirection: 'CROISSANT',
    blocking: false,
  },
  {
    id: 'age',
    name: 'Ancienneté',
    weight: 30,
    min: 1,
    max: 20,
    favorableDirection: 'CROISSANT',
    blocking: true,
  },
  {
    id: 'debt_ratio',
    name: 'Ratio d\'Endettement',
    weight: 30,
    min: 0,
    max: 80,
    favorableDirection: 'DECROISSANT',
    blocking: false,
  },
];
```

### 5.3 Calculer le Score

```typescript
const result = engine.calculate({
  variables,
  values: {
    ca: 150000,
    age: 5,
    debt_ratio: 45,
  },
  missingPolicy: 'REFUSE',
});

console.log(`Score: ${result.score_final}/100`);
console.log(`Statut: ${result.status}`);
console.log(`Classification: ${result.classification}`);
```

---

## 6. Affichage PME (UX)

### 6.1 Avec Score BON/EXCELLENT

```
🎯 Score d'Éligibilité: 72/100 (BON)

✅ Points forts:
  - Ratio d'Endettement: 43.75/100 (excellent gestion)
  - Chiffre d'Affaires: 22.22/100 (correct)

⚠️ Points faibles:
  - Ancienneté: 21.05/100 (jeune entreprise, points d'amélioration)

Recommandation: Vous êtes éligible! Prochaine étape: déposer votre dossier.
```

### 6.2 Avec Critère Bloquant

```
❌ Votre candidature n'est pas éligible

Raison: "Ancienneté" est inférieur au minimum (0 < 1)

Cette institution demande une ancienneté minimum de 1 an.
Veuillez nous recontacter une fois cette condition respectée.
```

---

## 7. Tests Unitaires

Voir `scoring.test.ts` pour:
- ✅ Normalisation CROISSANT
- ✅ Normalisation DECROISSANT
- ✅ Bornage (clamp)
- ✅ Critères bloquants
- ✅ Erreur max=min
- ✅ Somme poids != 100
- ✅ Valeurs manquantes
- ✅ Pondération multi-variables
- ✅ Exemple complet chiffré

**Lancer les tests:**
```bash
npm run test:scoring
```

---

## 8. Intégration API

### Endpoint: POST /api/simulations/calculate

**Request:**
```json
{
  "product_id": "...",
  "values": {
    "ca": 150000,
    "age": 5,
    "debt_ratio": 45
  }
}
```

**Response:**
```json
{
  "score_final": 28.34,
  "status": "ELIGIBLE",
  "classification": "RISQUE",
  "blocking_failed": [],
  "details": [...]
}
```

---

## 9. Politique des Valeurs Manquantes

### Mode REFUSE (défaut)
Si une variable n'a pas de valeur → CONFIG_ERROR

### Mode PENALIZE
Si une variable n'a pas de valeur → score = min (pénalisation maximale)

---

## 10. Checklist d'Implémentation

- [x] Classe `ScoringEngine`
- [x] Validation des poids
- [x] Normalisation directionnelle
- [x] Bornage (clamp)
- [x] Critères bloquants
- [x] Pondération
- [x] Classification
- [x] Gestion erreurs (max=min, somme poids, valeurs invalides)
- [x] Sortie détaillée
- [x] Tests unitaires
- [ ] Endpoint API
- [ ] Intégration frontend PME
- [ ] Intégration frontend Institution

---

**Moteur finalisé et testé ✅**

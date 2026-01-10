# ANALYSE COMPLÈTE DU FLUX DE DONNÉES - OGOUÉ

## 📋 RÉSUMÉ EXÉCUTIF

Le projet **OGOUÉ** est une plateforme fintech B2B qui met en relation les **institutions financières** avec les **PME**. Le système permet aux institutions de créer des produits de crédit et des modèles de scoring, tandis que les PME peuvent simuler leur éligibilité.

---

## 🔄 FLUX UTILISATEUR GLOBAL

### 1. **INSTITUTION** → Inscription & Configuration
```
institution-register.html
├── Données capturées:
│   ├── institution_name (nom de l'institution)
│   ├── contact_name (nom du contact)
│   ├── email
│   └── password
├── Appels API: authAPI.register()
└── Stockage: users + institutions
```

### 2. **INSTITUTION** → Connexion
```
institution-login.html
├── Données: email, password
├── Appels API: authAPI.login()
└── Réponse: JWT token + user data
```

### 3. **INSTITUTION** → Dashboard
```
institution-tableau-bord.html
├── Affiche:
│   ├── Statistiques globales
│   ├── Nombre de simulations
│   ├── Score moyen
│   └── Taux d'acceptation
├── Appels API: 
│   ├── getInstitution()
│   └── getApplicationStats()
└── Navigation vers: Produits, Modèles, Dossiers
```

### 4. **INSTITUTION** → Gestion des Produits de Crédit
```
institution-creation-produit.html
├── Données capturées:
│   ├── product_name
│   ├── objective
│   ├── amount_min
│   ├── amount_max
│   ├── duration_min_months
│   ├── duration_max_months
│   ├── interest_rate
│   ├── fees
│   ├── required_documents[]
│   └── special_conditions
├── Appels API: productsAPI.createProduct()
├── Stockage: credit_products + required_documents
└── Relation: institution_id (FK)

institution-liste-produits.html
├── Affiche: Liste de tous les produits
├── Actions: Voir détails, Éditer, Supprimer
└── Appels API: 
    ├── getProducts()
    ├── updateProduct()
    └── deleteProduct()

institution-modification-produit.html
├── Édition des paramètres du produit
└── Appels API: updateProduct()
```

### 5. **INSTITUTION** → Gestion des Modèles de Scoring
```
institution-creation-modele.html
├── Données capturées:
│   ├── model_name
│   ├── description
│   ├── variables[] (variables du modèle)
│   │   ├── variable_name
│   │   ├── weight (%)
│   │   ├── type (number, category, etc.)
│   │   ├── min_value
│   │   └── max_value
│   ├── scoring_rules[] (règles de scoring)
│   │   ├── rule_condition
│   │   ├── score_adjustment
│   │   └── is_mandatory
│   └── passing_score (seuil de passage)
├── Appels API: scoringModelsAPI.createModel()
├── Stockage: scoring_models + model_variables + scoring_rules
└── Relation: institution_id (FK)

institution-liste-modeles.html
├── Affiche: Liste de tous les modèles
├── Actions: Voir détails, Éditer, Supprimer
└── Appels API: 
    ├── getModels()
    ├── updateModel()
    └── deleteModel()

institution-modification-modele.html
├── Édition des variables et règles du modèle
└── Appels API: updateModel()
```

### 6. **INSTITUTION** → Analyse des Dossiers
```
institution-analyse-dossier.html
├── Affiche: Tableau de toutes les applications PME
│   ├── Entreprise (PME name)
│   ├── Montant demandé
│   ├── Score final
│   ├── Statut (en attente, approuvé, rejeté)
│   └── Actions (Voir détails, Approver, Reject)
├── Appels API: 
│   ├── getApplications()
│   ├── getApplicationDetails(applicationId)
│   ├── approveApplication()
│   └── rejectApplication()
└── Flux détail: Montre les données saisies + score calculé + raison

institution-parametrage-modele.html
├── Configuration des paramètres du modèle
└── (Basée sur le modèle sélectionné)
```

---

## 🎯 FLUX PME

### 7. **PME** → Sélection d'Institution
```
pme-selection-institution.html
├── Affiche: Liste de toutes les institutions
├── Sélection: Choisir une institution
└── Navigation: Vers formulaire de simulation
```

### 8. **PME** → Simulation de Financement
```
pme-formulaire-simulation.html
├── Données capturées (correspondant aux variables du modèle):
│   ├── Informations projet:
│   │   ├── credit_product_id (le produit sélectionné)
│   │   ├── requested_amount
│   │   └── requested_duration_months
│   ├── Informations entreprise:
│   │   ├── annual_revenue
│   │   ├── employee_count
│   │   ├── years_active
│   │   ├── sector
│   │   └── credit_score (optionnel)
│   └── Métadonnées:
│       ├── pme_id
│       ├── timestamp
│       └── institution_id
│
├── Appels API: 
│   ├── getProducts() → Populate product dropdown
│   └── submitApplication()
│
├── IMPORTANT: Les données sont stockées dans "applications"
│   ├── Contiennent les réponses du formulaire
│   ├── Liées au modèle de scoring de l'institution
│   └── Utilisées pour le calcul du score
│
└── Navigation: Vers résultats de simulation

pme-resultats-simulation.html
├── Affiche:
│   ├── Score final (calculé par le modèle)
│   ├── Détail du calcul (breakdown par variable)
│   ├── Recommandation (approuvé/rejeté)
│   ├── Raison de la décision
│   └── Prochaines étapes
├── Appels API: getApplicationResult()
└── État: L'application est maintenant en attente de révision par l'institution
```

---

## 📊 STRUCTURE DE DONNÉES ACTUELLE

### **Tables principales (database-schema-v2.sql)**

```
users (authentification)
├── id (UUID, PK)
├── email
├── password_hash
├── role (institution, pme, admin)
├── full_name
├── phone
├── is_active
├── email_verified
├── last_login
├── created_at
└── updated_at

institutions (profils institution)
├── id (UUID, PK)
├── user_id (FK → users) [UNIQUE]
├── name
├── registration_number
├── phone, website, address, city, postal_code, country
├── logo_url, description
├── status (active, inactive, pending)
└── timestamps

pmes (profils PME)
├── id (UUID, PK)
├── user_id (FK → users) [UNIQUE]
├── company_name
├── registration_number
├── sector, annual_revenue, employee_count, years_active
├── address, city, postal_code, country
├── business_description
├── credit_score
├── status (active, inactive, pending)
└── timestamps

credit_products (produits de crédit)
├── id (UUID, PK)
├── institution_id (FK → institutions)
├── name, objective, description
├── amount_min, amount_max
├── duration_min_months, duration_max_months
├── interest_rate, fees (?)
├── required_documents[] (separate table)
├── is_active
└── timestamps

scoring_models (modèles de scoring)
├── id (UUID, PK)
├── institution_id (FK → institutions)
├── name, description
├── model_variables[] (separate table)
├── scoring_rules[] (separate table)
├── passing_score
├── is_active
└── timestamps

model_variables (variables d'un modèle)
├── id (UUID, PK)
├── scoring_model_id (FK → scoring_models)
├── variable_name
├── weight (%)
├── type (number, category, etc.)
├── min_value, max_value
├── description
└── timestamps

scoring_rules (règles de notation)
├── id (UUID, PK)
├── scoring_model_id (FK → scoring_models)
├── rule_condition
├── score_adjustment
├── is_mandatory
└── timestamps

applications (demandes de financement PME)
├── id (UUID, PK)
├── pme_id (FK → pmes)
├── institution_id (FK → institutions)
├── credit_product_id (FK → credit_products)
├── scoring_model_id (FK → scoring_models) [pour référence]
├── application_data (JSON) [IMPORTANT: contient les réponses du formulaire]
├── calculated_score
├── recommendation (approved, rejected, pending)
├── reason_for_decision
├── status (pending, approved, rejected, under_review)
├── reviewed_by (FK → users, institution reviewer)
├── reviewed_at
└── timestamps

application_documents (documents fournis)
├── id (UUID, PK)
├── application_id (FK → applications)
├── document_type
├── file_url
├── upload_date
└── verification_status
```

---

## 🎯 RELATIONS CLÉS

### **Flux Principal: PME → Application → Institution**

```
PME                   Application              Institution
user (role=pme)  →   applications        ←   user (role=institution)
  ↓                      ↓                      ↓
pmes                 pme_id (FK) ──────→   institutions
                     institution_id (FK)
                     credit_product_id ────→ credit_products
                     scoring_model_id ──────→ scoring_models
                     application_data ──────→ JSON (formulaire rempli)
                     calculated_score ──────→ Résultat du modèle
```

### **Configuration par Institution**

```
institutions
├── credit_products[] (produits offerts)
│   ├── required_documents[] (documents nécessaires)
│   └── Chaque produit peut avoir plusieurs variables
│
└── scoring_models[] (modèles de scoring)
    ├── model_variables[] (variables du modèle)
    └── scoring_rules[] (règles de notation)
```

---

## 📝 FLUX DE DONNÉES PAR PAGE

### **Créer un Produit**
```
Données saisies dans institution-creation-produit.html
         ↓
Appel API: POST /api/credit-products
         ↓
Insertion dans credit_products
         ↓
Insertion dans required_documents (si présent)
         ↓
Affichage dans institution-liste-produits.html
```

### **Créer un Modèle de Scoring**
```
Données saisies dans institution-creation-modele.html
         ↓
Appel API: POST /api/scoring-models
         ↓
Insertion dans scoring_models
         ↓
Insertion dans model_variables[] (boucle)
         ↓
Insertion dans scoring_rules[] (boucle)
         ↓
Affichage dans institution-liste-modeles.html
```

### **Soumettre une Simulation (PME)**
```
Données du formulaire pme-formulaire-simulation.html
├── credit_product_id (sélectionné)
├── Données de l'entreprise (revenue, employees, sector, etc.)
├── Données du projet (montant, durée)
└── Autres variables du modèle
         ↓
Appel API: POST /api/applications
         ↓
Insertion dans applications
├── application_data: JSON complet du formulaire
├── pme_id: Lié à la PME
├── institution_id: Basé sur le produit sélectionné
├── credit_product_id: Le produit choisi
└── scoring_model_id: Le modèle de l'institution
         ↓
Calcul du score (backend)
├── Lecture des model_variables et scoring_rules
├── Application des règles sur application_data
├── Stockage du calculated_score
└── Génération de la recommendation
         ↓
Affichage dans pme-resultats-simulation.html
```

### **Réviser une Application (Institution)**
```
Affichage dans institution-analyse-dossier.html
├── Liste de toutes les applications (status = pending)
├── Affiche: score, montant, entreprise
└── Actions: Voir détails, Approver, Reject
         ↓
Clic "Voir détails"
         ↓
Appel API: GET /api/applications/{applicationId}
         ↓
Affichage du détail:
├── Données PME
├── Données application_data (formulaire rempli)
├── Détail du score (breakdown)
├── Raison de la recommandation
└── Actions: Approver/Reject
         ↓
Appel API: PUT /api/applications/{applicationId}
├── body: { status: 'approved' ou 'rejected', reviewed_by: user_id }
└── Mise à jour de: status, reviewed_by, reviewed_at
```

---

## 🔍 POINTS CLÉS À NOTER

### **1. Décision de Scoring**
- Le **scoring est automatique** basé sur le modèle de l'institution
- Chaque modèle a des **variables**, des **poids**, et des **règles**
- Les données du formulaire PME sont mappées aux variables du modèle
- Un score final est calculé et une recommandation est générée

### **2. Application Data (JSON)**
- Le champ `application_data` dans `applications` stocke le formulaire complet en JSON
- Cela permet de conserver exactement ce que la PME a saisi
- Utile pour l'audit et la traçabilité

### **3. Relation Produit ↔ Modèle**
- **Question importante**: Un produit a-t-il **un seul modèle** ou **plusieurs modèles** de scoring?
- Actuellement, le schéma n'est pas clair sur ce point
- Le modèle est lié à l'institution, pas au produit

### **4. Documents Requis**
- Chaque produit a une liste de documents requis
- Cette liste devrait être rappelée lors du dépôt de candidature (pas encore implémentée dans le formulaire)

---

## 🚨 PROBLÈMES IDENTIFIÉS DANS LE FLUX ACTUEL

### **1. Manque de clarté: Produit-Modèle**
- Est-ce que chaque produit utilise un modèle spécifique?
- Ou toutes les applications d'une institution utilisent le même modèle?

### **2. Variables du formulaire ↔ Modèle**
- Le formulaire PME a des champs fixes (revenue, employees, sector, credit_score, duration)
- Mais le modèle de scoring est complètement flexible (variables personnalisées)
- **Comment mapper ces deux?** 

### **3. Validation des données**
- Les min/max du modèle doivent-ils être appliqués au formulaire?
- Les champs requis du modèle doivent-ils être obligatoires dans le formulaire?

### **4. Required Documents**
- Ne sont actuellement **jamais montrés** dans le formulaire de simulation
- Doivent-ils être uploader lors de la soumission?

### **5. Statuts des applications**
- Progression: pending → under_review → approved/rejected
- Mais qui peut changer le statut et quand?

---

## 📌 RECOMMANDATIONS DE RESTRUCTURATION BD

### **À clarifier AVANT de restructurer:**

1. **Relation Produit-Modèle**: 1-to-1 ou 1-to-many?
   - Suggestion: **1 produit = 1 modèle de scoring** (plus logique)
   
2. **Flexibilité des variables**:
   - Les variables du modèle doivent-elles être **dynamiquement** reflétées dans le formulaire?
   - Ou le formulaire reste-t-il **fixe** avec des champs prédéfinis?

3. **Validation en cascade**:
   - Quel est l'ordre de validation?
   - Produit → Modèle → Variables → Règles → Score?

4. **Documents**:
   - Documents requis: obligatoires lors de la soumission ou après?
   - Où stocker les fichiers uploadés?

---

## 🎓 CONCLUSION

Le flux actuel est **bien structuré** mais nécessite une **clarification des relations métier**:
- ✅ Authentification et profiles clairs
- ✅ Création de produits et modèles fonctionnelle
- ✅ Soumission et scoring d'applications possible
- ❓ Relation produit-modèle ambiguë
- ❓ Variables flexibles vs formulaire fixe
- ⚠️ Documents requis non intégrés au flux

**Prêt pour restructuration une fois ces points clarifiés!**

---

## 📂 FICHIERS À CONSULTER

**HTML (Front-end)**:
- Authentification: `institution-login.html`, `institution-register.html`
- Produits: `institution-creation-produit.html`, `institution-liste-produits.html`, `institution-modification-produit.html`
- Modèles: `institution-creation-modele.html`, `institution-liste-modeles.html`, `institution-modification-modele.html`, `institution-parametrage-modele.html`
- PME: `pme-formulaire-simulation.html`, `pme-resultats-simulation.html`, `pme-selection-institution.html`
- Dossiers: `institution-analyse-dossier.html`
- Dashboard: `institution-tableau-bord.html`

**Backend**:
- Routes: `backend/src/routes/`
- Controllers: `backend/src/controllers/`
- Types: `backend/src/types/`
- Services: `backend/src/services/`

**Schémas SQL**:
- `database-schema.sql` (v1)
- `database-schema-v2.sql` (v2 - recommandée)

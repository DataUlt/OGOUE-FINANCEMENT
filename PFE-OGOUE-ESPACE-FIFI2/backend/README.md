# OGOUÉ Backend

Backend Node.js + Express + TypeScript pour la plateforme OGOUÉ

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env

# Démarrer en développement
npm run dev

# Build pour production
npm run build

# Démarrer en production
npm start
```

## 📁 Structure

```
backend/
├── src/
│   ├── config.ts              # Configuration générale
│   ├── index.ts               # Entrée principale
│   ├── controllers/           # Logique métier
│   │   └── auth.ts
│   ├── middleware/            # Middlewares Express
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── routes/                # Routes API
│   │   └── index.ts
│   └── lib/                   # Bibliothèques
│       └── supabase.ts
├── dist/                      # Build compilé
├── .env                       # Variables d'environnement (ne pas commiter)
├── .env.example               # Template .env
├── tsconfig.json
└── package.json
```

## 🔐 Authentification

Toutes les routes protégées doivent inclure le header:
```
Authorization: Bearer <token>
```

## 📚 APIs disponibles

### Auth
- `POST /api/auth/register` - Créer un compte
- `POST /api/auth/login` - Se connecter
- `GET /api/auth/me` - Profil utilisateur (protégé)
- `POST /api/auth/logout` - Déconnexion

## ⚙️ Configuration Supabase

Vos credentials sont déjà configurés dans `.env`

## 📝 Notes

- TypeScript avec strict mode activé
- CORS configuré pour localhost et vos domaines
- JWT pour l'authentification
- Gestion d'erreurs centralisée

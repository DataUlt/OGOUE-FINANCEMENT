# 📸 Configuration Storage Supabase - Logos Institutions

## ✅ À faire dans Supabase :

### 1. **Créer un Bucket Storage**
- Aller à **Supabase Dashboard** > **Storage**
- Cliquer sur **New bucket**
- Nom : `institution-logos`
- Cocher : **Make it public** ✅
- Cliquer **Create bucket**

### 2. **Configurer les RLS (Row Level Security)**
Le bucket public permet tous les uploads. Si tu veux plus de contrôle :

```sql
-- Dans Supabase SQL Editor
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'institution-logos');

CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'institution-logos');
```

### 3. **Exécuter la migration SQL**
Copie le contenu de `add-institution-fields.sql` dans Supabase SQL Editor et exécute-le.

## 🔧 Étapes à faire localement :

### 1. **Installer les dépendances**
```bash
cd backend
npm install
```

### 2. **Relancer le backend**
```bash
npm run build && node dist/index.js
```

### 3. **Tester le formulaire**
- Va à http://localhost:8000/institution-register.html
- Remplis le formulaire avec un logo
- Le logo sera uploadé dans Supabase Storage
- L'URL sera stockée en BD

## 📊 Architecture finale :

```
Institution Registration Form
         ↓
         ↓ Upload file + Form data
         ↓
Backend (POST /api/auth/upload-logo)
         ↓
         ├→ Upload image → Supabase Storage (bucket: institution-logos)
         ├→ Get public URL
         └→ Return logoUrl
         ↓
Institution Registration (POST /api/auth/register)
         ↓
         ├→ Create user
         ├→ Create institution + store logoUrl
         └→ Return success
         ↓
Database (institution record with logo_url pointing to public Storage URL)
```

## 🎯 Avantages de cette approche :

✅ URLs réutilisables partout (Dashboard, Cards, etc.)
✅ Pas de base64 volumineux en BD
✅ Images servies directement par CDN Supabase
✅ Gestion facile des images (suppression, remplacement)
✅ Scalable et efficace

## 🚀 Prochaines étapes :

1. Créer le bucket storage
2. Installer les dépendances (`npm install`)
3. Relancer le backend
4. Tester l'enregistrement d'une institution avec logo

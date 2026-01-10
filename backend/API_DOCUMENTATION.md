# 📚 OGOUÉ Backend - API Documentation

## 🔐 Authentication

### Register
```
POST /api/auth/register

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "User Name",
  "role": "institution" | "pme"
}

Response:
{
  "message": "User created successfully",
  "user": { id, email, role, fullName },
  "token": "jwt_token"
}
```

### Login
```
POST /api/auth/login

{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "message": "Login successful",
  "user": { id, email, role, fullName },
  "token": "jwt_token"
}
```

### Get Current User
```
GET /api/auth/me
Headers: Authorization: Bearer {token}

Response:
{
  "user": { id, email, role, fullName, createdAt }
}
```

### Logout
```
POST /api/auth/logout
Headers: Authorization: Bearer {token}

Response:
{
  "message": "Logout successful"
}
```

---

## 💳 Credit Products

### Get All Public Products (no auth required)
```
GET /api/credit-products/public

Response:
{
  "products": [
    {
      "id": "uuid",
      "name": "Crédit d'Investissement PME",
      "objective": "...",
      "amount_min": 5000,
      "amount_max": 50000,
      "duration_min_months": 12,
      "duration_max_months": 60,
      "institutions": { "name": "Banque Name" },
      "required_documents": [...]
    }
  ]
}
```

### Get Institution's Products
```
GET /api/credit-products
Headers: Authorization: Bearer {token}

Response:
{
  "products": [...]
}
```

### Get Single Product
```
GET /api/credit-products/:id

Response:
{
  "product": { ...details... }
}
```

### Create Product (Institution only)
```
POST /api/credit-products
Headers: Authorization: Bearer {token}

{
  "name": "Crédit d'Investissement PME",
  "objective": "Financer équipements et matériels",
  "description": "...",
  "amount_min": 5000,
  "amount_max": 50000,
  "duration_min_months": 12,
  "duration_max_months": 60,
  "interest_rate": 5.5,
  "required_documents": [
    { "name": "Plan d'affaires", "is_required": true },
    { "name": "États financiers", "is_required": true }
  ]
}

Response:
{
  "message": "Product created successfully",
  "product": {...}
}
```

### Update Product
```
PUT /api/credit-products/:id
Headers: Authorization: Bearer {token}

{
  "name": "...",
  "amount_min": 10000,
  "amount_max": 100000,
  "is_active": true,
  ...
}

Response:
{
  "message": "Product updated successfully",
  "product": {...}
}
```

### Delete Product
```
DELETE /api/credit-products/:id
Headers: Authorization: Bearer {token}

Response:
{
  "message": "Product deleted successfully"
}
```

---

## 📊 Scoring Models

### Get Institution's Models
```
GET /api/scoring-models
Headers: Authorization: Bearer {token}

Response:
{
  "models": [
    {
      "id": "uuid",
      "name": "PME Standard",
      "description": "...",
      "is_active": true,
      "model_variables": [
        {
          "variable_name": "annual_revenue",
          "weight": 30,
          "variable_type": "numeric",
          "min_value": 10000,
          "max_value": 1000000,
          "favorable_sense": "high",
          "is_blocking": false
        }
      ]
    }
  ]
}
```

### Get Single Model
```
GET /api/scoring-models/:id
Headers: Authorization: Bearer {token}

Response:
{
  "model": {...}
}
```

### Create Model
```
POST /api/scoring-models
Headers: Authorization: Bearer {token}

{
  "name": "PME Standard",
  "description": "Modèle standard pour PME",
  "variables": [
    {
      "variable_name": "annual_revenue",
      "weight": 30,
      "variable_type": "numeric",
      "min_value": 10000,
      "max_value": 1000000,
      "favorable_sense": "high",
      "is_blocking": false
    },
    {
      "variable_name": "years_active",
      "weight": 20,
      "variable_type": "numeric",
      "min_value": 0,
      "max_value": 50,
      "favorable_sense": "high",
      "is_blocking": true
    }
  ]
}

Response:
{
  "message": "Model created successfully",
  "model": {...}
}
```

### Update Model
```
PUT /api/scoring-models/:id
Headers: Authorization: Bearer {token}

{
  "name": "...",
  "description": "...",
  "is_active": true
}

Response:
{
  "message": "Model updated successfully",
  "model": {...}
}
```

### Delete Model
```
DELETE /api/scoring-models/:id
Headers: Authorization: Bearer {token}

Response:
{
  "message": "Model deleted successfully"
}
```

### Add Variable to Model
```
POST /api/scoring-models/:modelId/variables
Headers: Authorization: Bearer {token}

{
  "variable_name": "credit_score",
  "weight": 25,
  "variable_type": "numeric",
  "min_value": 300,
  "max_value": 850,
  "favorable_sense": "high",
  "is_blocking": true
}

Response:
{
  "message": "Variable added successfully",
  "variable": {...}
}
```

### Update Variable
```
PUT /api/scoring-models/variables/:variableId
Headers: Authorization: Bearer {token}

{
  "weight": 30,
  "favorable_sense": "high"
}

Response:
{
  "message": "Variable updated successfully",
  "variable": {...}
}
```

### Delete Variable
```
DELETE /api/scoring-models/variables/:variableId
Headers: Authorization: Bearer {token}

Response:
{
  "message": "Variable deleted successfully"
}
```

---

## 📋 Applications (Dossiers)

### Get Applications
```
GET /api/applications
Headers: Authorization: Bearer {token}

# PME will see their own applications
# Institution will see applications submitted to them

Response:
{
  "applications": [
    {
      "id": "uuid",
      "status": "submitted|analyzing|approved|rejected|draft",
      "requested_amount": 50000,
      "calculated_score": 78,
      "pmes": { "company_name": "..." },
      "credit_products": { "name": "..." },
      "institutions": { "name": "..." },
      "created_at": "2024-01-01T00:00:00Z",
      "submitted_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Single Application
```
GET /api/applications/:id
Headers: Authorization: Bearer {token}

Response:
{
  "application": {
    "id": "uuid",
    "status": "...",
    "requested_amount": 50000,
    "requested_duration_months": 36,
    "simulation_data": { ...all simulation inputs... },
    "calculated_score": 78,
    "score_breakdown": {
      "annual_revenue": { weight: 30, score: 85, weighted_score: 25.5 },
      "years_active": { weight: 20, score: 90, weighted_score: 18 },
      "final_score": 78
    },
    "application_documents": [...],
    "analyst_notes": "...",
    "rejection_reason": null,
    "analyst_id": "uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Create Application (PME only)
```
POST /api/applications
Headers: Authorization: Bearer {token}

{
  "credit_product_id": "uuid",
  "institution_id": "uuid",
  "scoring_model_id": "uuid",
  "requested_amount": 50000,
  "requested_duration_months": 36,
  "simulation_data": {
    "annual_revenue": 500000,
    "years_active": 5,
    "credit_score": 750,
    "employee_count": 10
  }
}

Response:
{
  "message": "Application created successfully",
  "application": {...}
}
```

### Submit Application
```
POST /api/applications/:id/submit
Headers: Authorization: Bearer {token}

{
  "simulation_data": { ...all simulation data... }
}

# This endpoint:
# 1. Calculates score using scoring model
# 2. Changes status to "submitted"
# 3. Stores score breakdown

Response:
{
  "message": "Application submitted successfully",
  "application": {
    "status": "submitted",
    "calculated_score": 78,
    "score_breakdown": {...}
  }
}
```

### Update Application Status (Institution only)
```
PUT /api/applications/:id/status
Headers: Authorization: Bearer {token}

{
  "status": "analyzing|approved|rejected",
  "analyst_notes": "Application looks good...",
  "rejection_reason": "Credit score too low" // required if status is "rejected"
}

Response:
{
  "message": "Application status updated successfully",
  "application": {...}
}
```

### Delete Application (draft only)
```
DELETE /api/applications/:id
Headers: Authorization: Bearer {token}

Response:
{
  "message": "Application deleted successfully"
}
```

---

## 🎯 Scoring Logic

### Automatic Scoring Process

When an application is submitted with a scoring model:

1. **Data Extraction**: Get all variables from simulation_data
2. **Variable Scoring**: For each variable:
   - If numeric: normalize between min/max to 0-100
   - If categorical: 100 (true) or 0 (false)
   - Apply favorable_sense (invert if "low")
3. **Blocking Criteria**: If any blocking variable < 50:
   - Return score = 0
   - Mark application as blocked
4. **Final Score**: Sum of (variable_score × weight / 100)
5. **Recommendation**:
   - 80-100: APPROVED
   - 60-79: REVIEW_NEEDED
   - 40-59: RISKY
   - 0-39: REJECTED

### Score Breakdown Example
```json
{
  "annual_revenue": {
    "weight": 30,
    "value": 500000,
    "score": 85,
    "weighted_score": 25.5
  },
  "years_active": {
    "weight": 20,
    "value": 5,
    "score": 90,
    "weighted_score": 18,
    "blocking": false
  },
  "final_score": 78,
  "total_variables": 5,
  "calculated_at": "2024-01-01T00:00:00Z"
}
```

---

## 🔑 Authentication Header

All protected endpoints require:
```
Authorization: Bearer {jwt_token}
```

Tokens are valid for 7 days. After expiration, user must login again.

---

## ❌ Error Responses

All errors follow this format:
```json
{
  "error": "Error message",
  "status": 400
}
```

Common status codes:
- `400`: Bad request (missing/invalid fields)
- `401`: Unauthorized (invalid/expired token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `409`: Conflict (e.g., user already exists)
- `500`: Server error

---

## 📝 Example Workflow

### PME Workflow
1. Register as PME: `POST /api/auth/register` (role: "pme")
2. Login: `POST /api/auth/login`
3. Browse products: `GET /api/credit-products/public`
4. Create application: `POST /api/applications`
5. Submit application: `POST /api/applications/:id/submit`
6. Check status: `GET /api/applications/:id`
7. View score breakdown: `GET /api/applications/:id`

### Institution Workflow
1. Register as Institution: `POST /api/auth/register` (role: "institution")
2. Login: `POST /api/auth/login`
3. Create credit products: `POST /api/credit-products`
4. Create scoring model: `POST /api/scoring-models`
5. Add variables: `POST /api/scoring-models/:id/variables`
6. View submitted applications: `GET /api/applications`
7. Update application status: `PUT /api/applications/:id/status`

---

## 🧪 Testing with cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}' | jq -r '.token')

# Use token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/applications
```

// Auth Types
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  user_type: 'institution' | 'pme';
  institution_name?: string;
  pme_name?: string;
  pme_data?: any;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: any;
  token: string;
}

// Credit Product Types
export interface CreateProductRequest {
  institution_id: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  duration_months: number;
}

export interface CreateProductVariableRequest {
  product_id: string;
  variable_name: string;
  variable_type: string;
  weight: number;
}

export interface CreateScoringRuleRequest {
  model_id?: string;
  rule_name?: string;
  rule_condition?: string;
  rule_score?: number;
  min_value?: number | null;
  max_value?: number | null;
  category_value?: string | null;
  points_awarded: number;
  description?: string | null;
}

// Profile Types
export interface InstitutionProfileRequest {
  name?: string;
  institution_name?: string;
  sector?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface PMEProfileRequest {
  company_name?: string;
  rccm_number?: string;
  nif_number?: string;
  sector?: string;
  activity_description?: string;
  employees_count?: number;
  annual_revenue?: number;
  contact_email?: string;
  contact_phone?: string;
}

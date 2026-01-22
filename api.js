/**
 * OGOUÉ API Client v3
 * Centralized API calls for all frontend operations
 */

// Dynamically set API_BASE_URL based on environment
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // Production - use same domain as frontend
  return `https://${hostname}/api`;
})();

console.log('🔌 API Base URL:', API_BASE_URL);

// ============================================
// AUTHENTICATION
// ============================================

export const authAPI = {
  register: async (email, password, fullName, userType, institutionName = null, pmeData = null) => {
    const body = { 
      email, 
      password, 
      user_type: userType,
      full_name: fullName
    };
    
    // Add role-specific data
    if (userType === 'institution' && institutionName) {
      body.institution_name = institutionName;
    } else if (userType === 'pme' && pmeData) {
      // Extract pme_name from pmeData.company_name
      body.pme_name = pmeData.company_name;
      body.pme_data = pmeData;
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Registration failed");
    return data;
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  getCurrentUser: async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch user");
    return data;
  },

  logout: async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Logout failed");
    return data;
  },
};

// ============================================
// PROFILE
// ============================================

export const profileAPI = {
  getInstitution: async (token) => {
    const response = await fetch(`${API_BASE_URL}/profile/institution`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch institution");
    return data;
  },

  updateInstitution: async (token, institutionData) => {
    const response = await fetch(`${API_BASE_URL}/profile/institution`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(institutionData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update institution");
    return data;
  },

  getPME: async (token) => {
    const response = await fetch(`${API_BASE_URL}/profile/pme`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch PME profile");
    return data;
  },

  updatePME: async (token, pmeData) => {
    const response = await fetch(`${API_BASE_URL}/profile/pme`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(pmeData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update PME profile");
    return data;
  },
};

// ============================================
// CREDIT PRODUCTS
// ============================================

export const productsAPI = {
  getAllActive: async () => {
    const response = await fetch(`${API_BASE_URL}/credit-products/public/all`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch products");
    return data;
  },

  getProductForSimulation: async (productId) => {
    const response = await fetch(`${API_BASE_URL}/credit-products/public/${productId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch product");
    return data;
  },

  getInstitutionProducts: async (token) => {
    const response = await fetch(`${API_BASE_URL}/credit-products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch products");
    return data;
  },

  getProduct: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/credit-products/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch product");
    return data;
  },

  createProduct: async (token, productData) => {
    const response = await fetch(`${API_BASE_URL}/credit-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create product");
    return data;
  },

  updateProduct: async (token, id, productData) => {
    const response = await fetch(`${API_BASE_URL}/credit-products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update product");
    return data;
  },

  deleteProduct: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/credit-products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to delete product");
    return data;
  },
};

// ============================================
// SIMULATIONS (REPLACES APPLICATIONS)
// ============================================

export const simulationsAPI = {
  createSimulation: async (token, simulationData) => {
    const response = await fetch(`${API_BASE_URL}/simulations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(simulationData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create simulation");
    return data;
  },

  getPMESimulations: async (token) => {
    const response = await fetch(`${API_BASE_URL}/simulations/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch simulations");
    return data;
  },

  getInstitutionSimulations: async (token, institutionId) => {
    const response = await fetch(`${API_BASE_URL}/simulations/institution/${institutionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch simulations");
    return data;
  },

  getInstitutionSimulationStats: async (token, institutionId) => {
    const response = await fetch(`${API_BASE_URL}/simulations/institution/${institutionId}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch stats");
    return data;
  },

  getSimulation: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch simulation");
    return data;
  },

  deleteSimulation: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to delete simulation");
    return data;
  },
};

// ============================================
// SESSION MANAGEMENT
// ============================================

export const sessionAPI = {
  // Store token in localStorage
  setToken: (token) => {
    localStorage.setItem("ogoue_token", token);
  },

  // Get token from localStorage
  getToken: () => {
    return localStorage.getItem("ogoue_token");
  },

  // Clear token from localStorage
  clearToken: () => {
    localStorage.removeItem("ogoue_token");
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return !!localStorage.getItem("ogoue_token");
  },

  // Store user data in localStorage
  setUser: (user) => {
    localStorage.setItem("ogoue_user", JSON.stringify(user));
  },

  // Get user data from localStorage
  getUser: () => {
    const user = localStorage.getItem("ogoue_user");
    return user ? JSON.parse(user) : null;
  },

  // Clear user data
  clearUser: () => {
    localStorage.removeItem("ogoue_user");
  },

  // Store institution data in localStorage
  setInstitution: (institution) => {
    localStorage.setItem("ogoue_institution", JSON.stringify(institution));
  },

  // Get institution data from localStorage
  getInstitution: () => {
    const institution = localStorage.getItem("ogoue_institution");
    return institution ? JSON.parse(institution) : null;
  },

  // Clear institution data
  clearInstitution: () => {
    localStorage.removeItem("ogoue_institution");
  },

  // Store PME data in localStorage
  setPME: (pme) => {
    localStorage.setItem("ogoue_pme", JSON.stringify(pme));
  },

  // Get PME data from localStorage
  getPME: () => {
    const pme = localStorage.getItem("ogoue_pme");
    return pme ? JSON.parse(pme) : null;
  },

  // Clear PME data
  clearPME: () => {
    localStorage.removeItem("ogoue_pme");
  },

  // Logout
  logout: () => {
    sessionAPI.clearToken();
    sessionAPI.clearUser();
    sessionAPI.clearInstitution();
    sessionAPI.clearPME();
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const apiHelpers = {
  // Show error notification
  showError: (message) => {
    console.error(message);
    alert(`❌ Erreur: ${message}`);
  },

  // Show success notification
  showSuccess: (message) => {
    console.log(message);
    alert(`✅ ${message}`);
  },

  // Redirect to login if unauthorized
  handleUnauthorized: () => {
    sessionAPI.logout();
    window.location.href = "./institution-login.html";
  },

  // Check authentication and redirect if needed
  requireAuth: () => {
    if (!sessionAPI.isLoggedIn()) {
      apiHelpers.handleUnauthorized();
      return false;
    }
    return true;
  },

  // Load and display institution information
  loadInstitutionInfo: () => {
    const institution = sessionAPI.getInstitution();
    if (institution) {
      // Update sidebar elements if they exist
      const orgNameEl = document.getElementById('sidebarOrgName');
      const contactNameEl = document.getElementById('sidebarContactName');
      const orgEmailEl = document.getElementById('sidebarOrgEmail');

      if (orgNameEl) orgNameEl.textContent = institution.institution_name || 'Institution';
      if (contactNameEl) contactNameEl.textContent = institution.full_name || 'Contact';
      if (orgEmailEl) orgEmailEl.textContent = institution.email || 'email@example.com';
    }
  },

  // Initialize page (auth check + load info)
  initPage: () => {
    if (!apiHelpers.requireAuth()) return false;
    apiHelpers.loadInstitutionInfo();
    return true;
  },
};

// ============================================
// SCORING MODELS API
// ============================================

export const modelsAPI = {
  // Create a new scoring model
  createModel: async (token, modelData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/scoring-models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(modelData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create model');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error creating model:', error);
      throw error;
    }
  },

  // Get all models for institution
  getModels: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/scoring-models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch models');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching models:', error);
      throw error;
    }
  },

  // Get a single model by ID
  getModel: async (token, modelId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/scoring-models/${modelId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch model');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching model:', error);
      throw error;
    }
  },

  // Delete a model
  deleteModel: async (token, modelId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/scoring-models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete model');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error deleting model:', error);
      throw error;
    }
  },
};

export default {
  authAPI,
  profileAPI,
  productsAPI,
  modelsAPI,
  simulationsAPI,
  sessionAPI,
  apiHelpers,
};

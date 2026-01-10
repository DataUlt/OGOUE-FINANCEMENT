import { Response, Request } from "express";
import { supabase } from "../lib/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";
import type { CreateProductRequest, CreateProductVariableRequest, CreateScoringRuleRequest } from "../types/index.js";

export const creditProductsController = {
  // ============================================
  // CREDIT PRODUCTS
  // ============================================

  // Get products by institution ID (public endpoint for PMEs)
  getProductsByInstitution: async (req: Request, res: Response) => {
    try {
      const { institutionId } = req.params;

      if (!institutionId) {
        throw new AppError("Institution ID is required", 400);
      }

      // Get products with their variables and required documents
      const { data: products, error } = await supabase
        .from("credit_products")
        .select(
          `
          id,
          institution_id,
          name,
          objective,
          amount_min,
          amount_max,
          duration_min_months,
          duration_max_months,
          interest_type,
          typology,
          target,
          is_active,
          scoring_model_id,
          created_at,
          updated_at,
          product_variables(
            id,
            name,
            field_key,
            variable_type,
            weight,
            display_order
          ),
          product_required_documents(
            id,
            name
          )
        `
        )
        .eq("institution_id", institutionId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch products:', error);
        throw new AppError("Failed to fetch products: " + error.message, 500);
      }

      console.log('✅ Products retrieved:', products ? products.length : 0);
      res.json({ products: products || [] });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching products:', error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },

  // Get all products for authenticated institution
  getInstitutionProducts: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      console.log('🔍 User ID:', req.user.id);

      // Get institution ID
      const { data: institution, error: instError } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (instError) {
        console.error('❌ Institution lookup error:', instError);
        throw new AppError("Institution not found", 404);
      }

      if (!institution) {
        throw new AppError("Institution not found", 404);
      }

      console.log('✅ Institution found:', institution.id);

      // Get products with their variables and required documents
      const { data: products, error } = await supabase
        .from("credit_products")
        .select(
          `
          id,
          institution_id,
          name,
          objective,
          amount_min,
          amount_max,
          duration_min_months,
          duration_max_months,
          interest_type,
          typology,
          target,
          is_active,
          scoring_model_id,
          created_at,
          updated_at,
          product_variables(
            id,
            name,
            field_key,
            variable_type,
            weight,
            display_order
          ),
          product_required_documents(
            id,
            name
          )
        `
        )
        .eq("institution_id", institution.id)
        .order("created_at", { ascending: false });

      console.log('📦 Query error:', error);
      console.log('📊 Query result:', products);

      if (error) {
        console.error('❌ Failed to fetch products:', error);
        throw new AppError("Failed to fetch products: " + error.message, 500);
      }

      console.log('✅ Products retrieved:', products ? products.length : 0);
      res.json({ products: products || [] });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching products:', error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },

  // Get all distinct typologies
  getTypologies: async (req: AuthRequest, res: Response) => {
    try {
      const { data: products, error } = await supabase
        .from("credit_products")
        .select("typology")
        .not("typology", "is", null)
        .neq("typology", "");

      if (error) {
        throw new AppError("Failed to fetch typologies", 500);
      }

      // Extract unique typologies
      const typologies = [...new Set(products.map(p => p.typology))].filter(Boolean);
      
      console.log('✅ Typologies retrieved:', typologies);
      res.json({ typologies });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching typologies:', error);
      res.status(500).json({ error: "Failed to fetch typologies" });
    }
  },

  // Get single product with all details
  getProduct: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log('🔍 Getting product with ID:', id);

      const { data: product, error } = await supabase
        .from("credit_products")
        .select(
          `
          *,
          product_variables(*),
          product_required_documents(*)
        `
        )
        .eq("id", id)
        .single();

      console.log('📦 Query error:', error);
      console.log('📊 Query result:', product);

      if (error || !product) {
        console.error('❌ Product not found or error:', error);
        throw new AppError("Product not found", 404);
      }

      console.log('✅ Product retrieved:', id);
      res.json({ product });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching product:', error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  },

  // Create product with variables and scoring rules
  createProduct: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { name, objective, amount_min, amount_max, duration_min_months, duration_max_months, interest_type, typology, target, variables, required_documents, scoring_model_id }: any = req.body;

      // Validation
      if (!name || amount_min === undefined || amount_max === undefined) {
        throw new AppError("Name, amount_min, and amount_max are required", 400);
      }

      if (!Array.isArray(variables) || variables.length === 0) {
        throw new AppError("At least one variable is required", 400);
      }

      // Get institution
      const { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (!institution) {
        throw new AppError("Institution not found", 404);
      }

      // 1. Create product
      const productId = uuidv4();
      const { error: productError } = await supabase.from("credit_products").insert({
        id: productId,
        institution_id: institution.id,
        name,
        objective: objective || null,
        amount_min,
        amount_max,
        duration_min_months: duration_min_months || null,
        duration_max_months: duration_max_months || null,
        interest_type: interest_type || null,
        typology: typology || null,
        target: target || null,
        scoring_model_id: scoring_model_id || null,
        is_active: true,
      });

      if (productError) {
        console.error('❌ Product insert error:', productError);
        throw new AppError("Failed to create product", 500);
      }

      // 2. Create variables with scoring rules
      for (const variable of variables) {
        const variableId = uuidv4();

        const { error: varError } = await supabase.from("product_variables").insert({
          id: variableId,
          credit_product_id: productId,
          name: variable.name,
          description: variable.description || null,
          field_key: variable.field_key,
          variable_type: variable.variable_type,
          is_required: variable.is_required,
          numeric_min: variable.numeric_min || null,
          numeric_max: variable.numeric_max || null,
          categories: variable.categories ? JSON.stringify(variable.categories) : null,
          weight: variable.weight,
          display_order: variable.display_order || 0,
        });

        if (varError) {
          console.error('❌ Variable insert error:', varError);
          throw new AppError("Failed to create product variables", 500);
        }

        // Create scoring rules for this variable
        if (variable.scoring_rules && Array.isArray(variable.scoring_rules)) {
          const rulesToInsert = variable.scoring_rules.map((rule: CreateScoringRuleRequest) => ({
            id: uuidv4(),
            product_variable_id: variableId,
            min_value: rule.min_value || null,
            max_value: rule.max_value || null,
            category_value: rule.category_value || null,
            points_awarded: rule.points_awarded,
            description: rule.description || null,
          }));

          const { error: ruleError } = await supabase.from("variable_scoring_rules").insert(rulesToInsert);

          if (ruleError) {
            console.error('❌ Rule insert error:', ruleError);
            throw new AppError("Failed to create scoring rules", 500);
          }
        }
      }

      // 3. Create required documents for the product
      if (Array.isArray(required_documents) && required_documents.length > 0) {
        const documentsToInsert = required_documents.map((doc: any) => ({
          id: uuidv4(),
          credit_product_id: productId,
          name: doc.name || doc,
        }));

        const { error: docError } = await supabase.from("product_required_documents").insert(documentsToInsert);

        if (docError) {
          console.error('❌ Document insert error:', docError);
          throw new AppError("Failed to create required documents", 500);
        }
      }

      console.log('✅ Product created with variables and documents:', productId);
      res.status(201).json({
        message: "Product created successfully",
        product_id: productId,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error creating product:', error);
      res.status(500).json({ error: "Failed to create product" });
    }
  },

  // Update product
  updateProduct: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { id } = req.params;
      const { name, objective, amount_min, amount_max, duration_min_months, duration_max_months, interest_type, typology, target, scoring_model_id, is_active } = req.body;

      // Verify ownership
      const { data: product } = await supabase
        .from("credit_products")
        .select("institution_id")
        .eq("id", id)
        .single();

      if (!product) {
        throw new AppError("Product not found", 404);
      }

      const { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (!institution || product.institution_id !== institution.id) {
        throw new AppError("Unauthorized", 403);
      }

      // Update product
      const { error } = await supabase
        .from("credit_products")
        .update({
          name: name !== undefined ? name : undefined,
          objective: objective !== undefined ? objective : undefined,
          amount_min: amount_min !== undefined ? amount_min : undefined,
          amount_max: amount_max !== undefined ? amount_max : undefined,
          duration_min_months: duration_min_months !== undefined ? duration_min_months : undefined,
          duration_max_months: duration_max_months !== undefined ? duration_max_months : undefined,
          interest_type: interest_type !== undefined ? interest_type : undefined,
          typology: typology !== undefined ? typology : undefined,
          target: target !== undefined ? target : undefined,
          scoring_model_id: scoring_model_id !== undefined ? scoring_model_id : undefined,
          is_active: is_active !== undefined ? is_active : undefined,
          updated_at: new Date(),
        })
        .eq("id", id);

      if (error) throw new AppError("Failed to update product", 500);

      console.log('✅ Product updated:', id);
      res.json({ message: "Product updated successfully" });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error updating product:', error);
      res.status(500).json({ error: "Failed to update product" });
    }
  },

  // Delete product (cascades to variables and rules)
  deleteProduct: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { id } = req.params;

      // Verify ownership
      const { data: product } = await supabase
        .from("credit_products")
        .select("institution_id")
        .eq("id", id)
        .single();

      if (!product) {
        throw new AppError("Product not found", 404);
      }

      const { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (!institution || product.institution_id !== institution.id) {
        throw new AppError("Unauthorized", 403);
      }

      const { error } = await supabase.from("credit_products").delete().eq("id", id);

      if (error) throw new AppError("Failed to delete product", 500);

      console.log('✅ Product deleted:', id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error deleting product:', error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  },

  // ============================================
  // PUBLIC PRODUCTS (for PMEs)
  // ============================================

  // Get all active products with their institution info
  getAllActiveProducts: async (req: Request, res: Response) => {
    try {
      const { institution_id } = req.query;

      let query = supabase
        .from("credit_products")
        .select(
          `
          id,
          name,
          description,
          objective,
          amount_min,
          amount_max,
          duration_min_months,
          duration_max_months,
          interest_rate,
          institution_id,
          institutions(id, name),
          product_variables(id, name, field_key, variable_type, weight)
        `
        )
        .eq("is_active", true);

      if (institution_id) {
        query = query.eq("institution_id", institution_id);
      }

      const { data: products, error } = await query.order("created_at", { ascending: false });

      if (error) throw new AppError("Failed to fetch products", 500);

      console.log('✅ Public products retrieved:', products.length);
      res.json({ products });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching public products:', error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },

  // Get product details for simulation (public)
  getProductForSimulation: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { data: product, error } = await supabase
        .from("credit_products")
        .select(
          `
          *,
          institutions(name),
          product_variables(*)
        `
        )
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error('❌ Supabase error fetching product:', error);
        throw new AppError("Product not found: " + error.message, 404);
      }
      
      if (!product) {
        console.error('❌ Product not found for ID:', id);
        throw new AppError("Product not found", 404);
      }

      // Récupérer les variables du modèle de scoring
      const { data: model_variables } = await supabase
        .from("model_variables")
        .select("id, name, weight, min_value, max_value, favorable_direction, is_blocking, variable_type")
        .eq("scoring_model_id", product.scoring_model_id);

      // Aplatir la relation institutions pour accès facile
      const institutionName = product.institutions && Array.isArray(product.institutions) 
        ? product.institutions[0]?.name 
        : product.institutions?.name;

      console.log('✅ Product for simulation retrieved:', id);
      console.log('✅ Institution name:', institutionName);
      console.log('✅ Model variables retrieved:', model_variables?.length || 0);
      
      res.json({ 
        product: {
          ...product,
          institution_name: institutionName
        },
        model_variables: model_variables || []
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching product:', error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  },
};
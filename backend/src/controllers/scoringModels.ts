import { Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

export const scoringModelsController = {
  // Create a new scoring model (supports both legacy and API-based)
  createModel: async (req: AuthRequest, res: Response) => {
    try {
      console.log('🔵 Create model request received');
      console.log('📥 Request body:', req.body);
      console.log('👤 User:', req.user?.id);
      
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { name, description, variables, api_config } = req.body;

      // Validation
      if (!name) {
        throw new AppError("Name is required", 400);
      }

      // Check if it's an API-based model
      const isApiModel = api_config && api_config.endpoint && api_config.method;

      if (!variables || !Array.isArray(variables) || variables.length === 0) {
        throw new AppError("At least one variable is required", 400);
      }

      // Validate variables based on model type
      for (const variable of variables) {
        if (isApiModel) {
          // API-based model: need api_name and display_name
          if (!variable.api_name || !variable.display_name) {
            throw new AppError("Each variable must have api_name and display_name", 400);
          }
        } else {
          // Legacy model: need name, weight, min, max
          if (!variable.name || variable.weight === undefined || variable.min === undefined || variable.max === undefined) {
            throw new AppError("Each variable must have name, weight, min, and max", 400);
          }
        }
      }

      // Get institution ID
      let { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      // If institution doesn't exist, create it
      if (!institution) {
        console.log('⚠️ Institution not found for user:', req.user.id);
        console.log('📝 Creating institution for user...');
        
        // Get user details
        const { data: user } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", req.user.id)
          .single();

        if (user) {
          const { data: newInstitution } = await supabase
            .from("institutions")
            .insert({
              id: uuidv4(),
              user_id: req.user.id,
              name: user.full_name || "Institution",
            })
            .select()
            .single();

          if (newInstitution) {
            institution = newInstitution;
            console.log('✅ Institution created:', newInstitution.id);
          }
        }
      }

      if (!institution) {
        throw new AppError("Institution not found and could not be created", 404);
      }

      // Create the scoring model
      const modelId = uuidv4();
      const modelData: any = {
        id: modelId,
        institution_id: institution.id,
        name,
        description: description || null,
        is_active: true,
        created_at: new Date(),
      };

      // Add API config if provided
      if (isApiModel) {
        modelData.api_endpoint = api_config.endpoint;
        modelData.api_method = api_config.method;
        modelData.api_response_mapping = api_config.response_mapping || { score_field: 'score', explanation_field: 'explanation' };
      }

      const { error: modelError } = await supabase.from("scoring_models").insert(modelData);

      if (modelError) {
        console.error('❌ Model insert error:', modelError);
        throw new AppError("Failed to create model", 500);
      }

      // Insert model variables (supports both legacy and API-based)
      const modelVariablesData = variables.map((variable: any) => {
        if (isApiModel) {
          // API-based model variables
          return {
            id: uuidv4(),
            scoring_model_id: modelId,
            name: variable.api_name,
            display_name: variable.display_name,
            description: variable.description || null,
            variable_type: variable.variable_type || 'number',
            weight: 0,
            min_value: null,
            max_value: null,
            unit: null,
            favorable_direction: null,
            is_blocking: false,
            created_at: new Date(),
          };
        } else {
          // Legacy model variables
          return {
            id: uuidv4(),
            scoring_model_id: modelId,
            name: variable.name,
            display_name: variable.name,
            description: null,
            weight: variable.weight,
            min_value: variable.min,
            max_value: variable.max,
            unit: variable.unit || null,
            favorable_direction: variable.favorableDirection || 'Croissant',
            is_blocking: variable.isBlocking || false,
            variable_type: variable.type || 'numeric',
            created_at: new Date(),
          };
        }
      });

      const { error: variablesError } = await supabase
        .from("model_variables")
        .insert(modelVariablesData);

      if (variablesError) {
        console.error('❌ Variables insert error:', variablesError);
        // Don't fail completely, just log warning
        console.warn('⚠️ Model created but variables failed to insert');
      }

      console.log('✅ Scoring model created:', { modelId, name, variableCount: variables.length, isApiModel });
      res.status(201).json({
        message: "Scoring model created successfully",
        model: {
          id: modelId,
          name,
          description,
          api_config: isApiModel ? api_config : null,
          variables: variables.length,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error creating model:', error);
      res.status(500).json({ error: "Failed to create scoring model" });
    }
  },

  // Get all models for institution
  getInstitutionModels: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      // Get institution ID
      const { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (!institution) {
        throw new AppError("Institution not found", 404);
      }

      // Get models
      const { data: models, error } = await supabase
        .from("scoring_models")
        .select(
          `
          *,
          model_variables(*)
        `
        )
        .eq("institution_id", institution.id)
        .order("created_at", { ascending: false });

      if (error) throw new AppError("Failed to fetch models", 500);

      // Transform models to include api_config structure
      const transformedModels = models?.map((model: any) => ({
        ...model,
        api_config: model.api_endpoint ? {
          method: model.api_method,
          endpoint: model.api_endpoint,
          response_mapping: model.api_response_mapping
        } : null
      }));

      res.json({ models: transformedModels });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch models" });
    }
  },

  // Get single model
  getModel: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data: model, error } = await supabase
        .from("scoring_models")
        .select(
          `
          *,
          model_variables(*)
        `
        )
        .eq("id", id)
        .single();

      if (error || !model) {
        throw new AppError("Model not found", 404);
      }

      // Transform model to include api_config structure
      const transformedModel = {
        ...model,
        api_config: model.api_endpoint ? {
          method: model.api_method,
          endpoint: model.api_endpoint,
          response_mapping: model.api_response_mapping
        } : null
      };

      res.json({ model: transformedModel });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch model" });
    }
  },


  // Update model
  updateModel: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { id } = req.params;
      const { name, description, is_active, variables, api_config } = req.body;

      // Get model and verify ownership
      const { data: model } = await supabase
        .from("scoring_models")
        .select("institution_id")
        .eq("id", id)
        .single();

      if (!model) {
        throw new AppError("Model not found", 404);
      }

      const { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (!institution || model.institution_id !== institution.id) {
        throw new AppError("Unauthorized", 403);
      }

      // Build update object
      const updateData: any = {
        name,
        description,
        is_active,
        updated_at: new Date(),
      };

      // Add API config if provided
      if (api_config) {
        updateData.api_endpoint = api_config.endpoint;
        updateData.api_method = api_config.method;
        updateData.api_response_mapping = api_config.response_mapping;
      }

      // Update model
      const { data: updated, error } = await supabase
        .from("scoring_models")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new AppError("Failed to update model", 500);
      }

      // Check if it's an API-based model
      const isApiModel = api_config && api_config.endpoint && api_config.method;

      // If variables provided, update them
      if (variables && Array.isArray(variables) && variables.length > 0) {
        // Delete old variables
        await supabase
          .from("model_variables")
          .delete()
          .eq("scoring_model_id", id);

        // Insert new variables (supports both legacy and API-based)
        const modelVariablesData = variables.map((variable: any) => {
          if (isApiModel || variable.api_name) {
            // API-based model variables
            return {
              id: uuidv4(),
              scoring_model_id: id,
              name: variable.api_name || variable.name,
              display_name: variable.display_name || variable.name,
              description: variable.description || null,
              variable_type: variable.variable_type || 'number',
              weight: 0,
              min_value: null,
              max_value: null,
              unit: null,
              favorable_direction: null,
              is_blocking: false,
              created_at: new Date(),
            };
          } else {
            // Legacy model variables
            return {
              id: uuidv4(),
              scoring_model_id: id,
              name: variable.name,
              display_name: variable.name,
              weight: variable.weight,
              min_value: variable.min,
              max_value: variable.max,
              unit: variable.unit || '',
              favorable_direction: variable.favorableDirection || 'Croissant',
              is_blocking: variable.isBlocking || false,
              variable_type: variable.type || 'numeric',
              created_at: new Date(),
            };
          }
        });

        const { error: variablesError } = await supabase
          .from("model_variables")
          .insert(modelVariablesData);

        if (variablesError) {
          console.error('❌ Variables update error:', variablesError);
          console.warn('⚠️ Model updated but variables failed to update');
        }
      }

      console.log('✅ Model updated:', { id, name });
      res.json({
        message: "Model updated successfully",
        model: updated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error updating model:', error);
      res.status(500).json({ error: "Failed to update model" });
    }
  },

  // Delete model
  deleteModel: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { id } = req.params;

      // Get model and verify ownership
      const { data: model } = await supabase
        .from("scoring_models")
        .select("institution_id")
        .eq("id", id)
        .single();

      if (!model) {
        throw new AppError("Model not found", 404);
      }

      const { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (!institution || model.institution_id !== institution.id) {
        throw new AppError("Unauthorized", 403);
      }

      const { error } = await supabase.from("scoring_models").delete().eq("id", id);

      if (error) {
        throw new AppError("Failed to delete model", 500);
      }

      res.json({ message: "Model deleted successfully" });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete model" });
    }
  },

  // Add variable to model
  addVariable: async (req: AuthRequest, res: Response) => {
    try {
      const { modelId } = req.params;
      const { variable_name, weight, variable_type, min_value, max_value, favorable_sense, is_blocking } = req.body;

      if (!variable_name || weight === undefined) {
        throw new AppError("Missing required fields", 400);
      }

      const { data: variable, error } = await supabase
        .from("model_variables")
        .insert([
          {
            scoring_model_id: modelId,
            variable_name,
            weight,
            variable_type,
            min_value: min_value || null,
            max_value: max_value || null,
            favorable_sense: favorable_sense || null,
            is_blocking: is_blocking || false,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new AppError("Failed to add variable", 500);
      }

      res.status(201).json({
        message: "Variable added successfully",
        variable,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to add variable" });
    }
  },

  // Update variable
  updateVariable: async (req: AuthRequest, res: Response) => {
    try {
      const { variableId } = req.params;
      const { variable_name, weight, variable_type, min_value, max_value, favorable_sense, is_blocking } = req.body;

      const { data: updated, error } = await supabase
        .from("model_variables")
        .update({
          variable_name,
          weight,
          variable_type,
          min_value: min_value || null,
          max_value: max_value || null,
          favorable_sense: favorable_sense || null,
          is_blocking: is_blocking || false,
        })
        .eq("id", variableId)
        .select()
        .single();

      if (error) {
        throw new AppError("Failed to update variable", 500);
      }

      res.json({
        message: "Variable updated successfully",
        variable: updated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to update variable" });
    }
  },

  // Delete variable
  deleteVariable: async (req: AuthRequest, res: Response) => {
    try {
      const { variableId } = req.params;

      const { error } = await supabase.from("model_variables").delete().eq("id", variableId);

      if (error) {
        throw new AppError("Failed to delete variable", 500);
      }

      res.json({ message: "Variable deleted successfully" });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete variable" });
    }
  },
};

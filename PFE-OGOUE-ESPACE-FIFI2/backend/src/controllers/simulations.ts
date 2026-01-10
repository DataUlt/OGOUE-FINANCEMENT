import { Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { ScoringEngine, type Variable } from "../lib/scoring.js";

export const simulationsController = {
  /**
   * POST /api/simulations/calculate (PUBLIC)
   * Calcule le score pour une simulation
   */
  calculateScore: async (req: any, res: Response) => {
    console.log("🎯 calculateScore handler appelé");
    try {
      const { product_id, values, pme_id } = req.body;

      console.log("📦 product_id:", product_id);
      console.log("📦 values:", values);
      console.log("📦 pme_id:", pme_id);
      
      if (!product_id || !values) {
        throw new AppError("product_id et values requis", 400);
      }

      // Récupérer le produit et son modèle de scoring
      const { data: product, error: productError } = await supabase
        .from("credit_products")
        .select(
          `
          id,
          name,
          institution_id,
          scoring_model_id
        `
        )
        .eq("id", product_id)
        .single();

      if (productError || !product) {
        console.error("❌ Product not found error:", productError);
        throw new AppError("Produit non trouvé", 404);
      }

      console.log("✅ Product retrieved:", product);

      // Récupérer les variables du modèle de scoring
      const { data: variables_data, error: variablesError } = await supabase
        .from("model_variables")
        .select("id, name, weight, min_value, max_value, favorable_direction, is_blocking")
        .eq("scoring_model_id", product.scoring_model_id);

      if (variablesError || !variables_data) {
        console.error("❌ Variables not found error:", variablesError);
        throw new AppError("Variables du modèle non trouvées", 404);
      }

      console.log("✅ Model variables retrieved:", variables_data);

      // Construire les variables pour le moteur de scoring
      const variables: Variable[] = variables_data.map(
        (mv: any) => ({
          id: mv.id,
          name: mv.name,
          weight: mv.weight,
          min: mv.min_value,
          max: mv.max_value,
          favorableDirection:
            mv.favorable_direction?.toUpperCase() === "CROISSANT"
              ? "CROISSANT"
              : "DECROISSANT",
          blocking: mv.is_blocking || false,
        })
      );

      // Créer le moteur et calculer
      const engine = new ScoringEngine();
      const result = engine.calculate({
        variables,
        values,
        missingPolicy: "REFUSE",
      });

      console.log("✅ Score calculé:", result.score_final);

      // Sauvegarder la simulation dans la base de données
      // Le pme_id peut être fourni ou sera null (cas PME anonyme)
      const { data: simulation, error: simulationError } = await supabase
        .from("simulations")
        .insert({
          pme_id: pme_id || null, // Optional PME ID
          institution_id: product.institution_id,
          credit_product_id: product_id,
          simulation_data: values,
          calculated_score: result.score_final,
          score_breakdown: result.details || [],
          recommendation: result.score_final >= 60 ? "eligible" : result.score_final >= 40 ? "conditional" : "ineligible",
          recommendation_reason: `Score: ${result.score_final}/100 - ${result.classification}`,
        })
        .select()
        .single();

      if (simulationError) {
        console.error("❌ Erreur sauvegarde simulation:", simulationError);
        throw new AppError("Erreur lors de la sauvegarde de la simulation", 500);
      }

      console.log("✅ Simulation sauvegardée:", simulation);
      res.json({ ...result, simulation_id: simulation.id });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur calcul score:", error);
      res.status(500).json({ error: "Erreur lors du calcul du score" });
    }
  },

  /**
   * GET /api/simulations/product/:productId (PUBLIC)
   * Récupère les variables du modèle de scoring pour la simulation
   */
  getProductVariables: async (req: any, res: Response) => {
    try {
      const { productId } = req.params;

      // Récupérer le produit pour avoir l'ID du modèle de scoring
      const { data: product, error: productError } = await supabase
        .from("credit_products")
        .select("id, name, scoring_model_id")
        .eq("id", productId)
        .single();

      if (productError || !product) {
        throw new AppError("Produit non trouvé", 404);
      }

      // Récupérer les variables du modèle de scoring
      const { data: variables, error: variablesError } = await supabase
        .from("model_variables")
        .select("id, name, weight, min_value, max_value, favorable_direction, is_blocking, variable_type")
        .eq("scoring_model_id", product.scoring_model_id)
        .order("id");

      if (variablesError) {
        throw new AppError("Variables non trouvées", 404);
      }

      console.log("✅ Model variables retrieved for product:", productId);
      res.json({
        product,
        model_variables: variables || []
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur récupération variables:", error);
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  },

  /**
   * GET /api/simulations/institution/:institutionId (PROTECTED)
   * Récupère toutes les simulations d'une institution
   */
  getInstitutionSimulations: async (req: any, res: Response) => {
    try {
      const { institutionId } = req.params;

      const { data: simulations, error } = await supabase
        .from("simulations")
        .select(
          `
          id,
          credit_product_id,
          calculated_score,
          created_at,
          simulation_data,
          credit_products!inner(
            name, 
            id, 
            scoring_model_id,
            product_variables(id, name, field_key),
            scoring_models(id, model_variables(id, name))
          )
        `
        )
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erreur récupération simulations:", error);
        throw new AppError("Erreur lors de la récupération des simulations", 500);
      }

      console.log("✅ Institution simulations retrieved:", simulations?.length || 0);
      res.json(simulations || []);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur simulations institution:", error);
      res.status(500).json({ error: "Erreur lors de la récupération" });
    }
  },

  /**
   * GET /api/simulations/institution/:institutionId/stats (PROTECTED)
   * Récupère les statistiques des simulations d'une institution
   */
  getInstitutionSimulationStats: async (req: any, res: Response) => {
    try {
      const { institutionId } = req.params;

      const { data: simulations, error } = await supabase
        .from("simulations")
        .select("calculated_score")
        .eq("institution_id", institutionId);

      if (error) {
        throw new AppError("Erreur lors de la récupération des statistiques", 500);
      }

      const scores = (simulations || []).map(s => s.calculated_score).filter(s => s !== null);
      const totalSimulations = scores.length;
      const averageScore = totalSimulations > 0 ? scores.reduce((a, b) => a + b, 0) / totalSimulations : 0;
      const scoresAbove60 = scores.filter(s => s >= 60).length;
      const percentageAbove60 = totalSimulations > 0 ? (scoresAbove60 / totalSimulations) * 100 : 0;

      console.log("✅ Simulation stats calculated:", { totalSimulations, averageScore, percentageAbove60 });
      
      res.json({
        total_simulations: totalSimulations,
        average_score: Math.round(averageScore * 100) / 100,
        scores_above_60_count: scoresAbove60,
        percentage_above_60: Math.round(percentageAbove60 * 100) / 100,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur stats simulations:", error);
      res.status(500).json({ error: "Erreur lors du calcul des statistiques" });
    }
  },

  /**
   * GET /api/simulations/product/:productId/stats (PUBLIC)
   * Récupère les statistiques pour un produit spécifique
   */
  getProductSimulationStats: async (req: any, res: Response) => {
    try {
      const { productId } = req.params;

      const { data: simulations, error } = await supabase
        .from("simulations")
        .select("calculated_score")
        .eq("credit_product_id", productId);

      if (error) {
        throw new AppError("Erreur lors de la récupération des statistiques du produit", 500);
      }

      const scores = (simulations || []).map(s => s.calculated_score).filter(s => s !== null);
      const totalSimulations = scores.length;
      const averageScore = totalSimulations > 0 ? scores.reduce((a, b) => a + b, 0) / totalSimulations : 0;

      console.log("✅ Product simulation stats calculated:", { productId, totalSimulations, averageScore });
      
      res.json({
        product_id: productId,
        total_simulations: totalSimulations,
        average_score: Math.round(averageScore * 100) / 100,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur stats produit:", error);
      res.status(500).json({ error: "Erreur lors du calcul des statistiques" });
    }
  },
};

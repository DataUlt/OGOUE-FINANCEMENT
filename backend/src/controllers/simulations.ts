import { Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { ScoringEngine, type Variable } from "../lib/scoring.js";
import fetch from "node-fetch";

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
        .select("id, name, weight, min_value, max_value, favorable_direction, is_blocking, unit")
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
   * POST /api/simulations/interpret (PUBLIC)
   * Appelle l'API OpenAI pour interpréter un score de simulation
   */
  interpretScore: async (req: any, res: Response) => {
    console.log("🤖 interpretScore handler appelé");
    try {
      const { score, classification, product_name, institution_name, variables_values, variables_names, variables_description, score_details } = req.body;

      if (typeof score !== 'number' || !classification || !product_name) {
        throw new AppError("score, classification et product_name requis", 400);
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new AppError("OpenAI API key non configurée", 500);
      }

      // Build detailed variables context
      let variablesContext = "";
      if (variables_values && Object.keys(variables_values).length > 0) {
        variablesContext = "\nVARIABLES ENTRÉES PAR L'UTILISATEUR:\n";
        Object.entries(variables_values).forEach(([key, value]: [string, any]) => {
          const name = variables_names?.[key] || key;
          variablesContext += `- ${name}: ${value}\n`;
        });
      }

      const prompt = `Tu es un expert senior en analyse de risque de crédit et en évaluation de l'éligibilité financière des entreprises.
Ton rôle est de fournir une interprétation professionnelle, pédagogique et personnalisée du score obtenu par un utilisateur,
en t'appuyant STRICTEMENT sur les données réelles qu'il a saisies et sur les caractéristiques du produit de crédit simulé.

========================
DONNÉES DU SCORE
========================
- Score final : ${score}/100
- Classification du score : ${classification}
- Produit de crédit : ${product_name}
- Institution financière : ${institution_name || "Non spécifiée"}

${variablesContext}

========================
CONTEXTE ET ATTENTES
========================
- L'interprétation doit être STRICTEMENT personnalisée : aucune phrase générique.
- Tu dois expliquer comment les valeurs précises saisies par l'utilisateur ont influencé le score obtenu.
- Tu dois mettre en évidence :
  • les points forts concrets du dossier
  • les éléments bloquants ou perfectibles
- Tu ne dois JAMAIS inventer de données, de règles ou de critères non fournis.

========================
FORMAT DE RÉPONSE (OBLIGATOIRE)
========================
Fournis UNIQUEMENT 3 à 4 paragraphes de texte, sans titre, sans liste, sans markdown :

1. Résumé du score obtenu, en lien direct avec le produit de crédit et les principales variables saisies.
2. Analyse détaillée des points forts et des points faibles du dossier, basée sur les valeurs réelles entrées.
3. Recommandations concrètes et actionnables pour améliorer l'éligibilité à ce produit précis.
4. Rappel clair que cette interprétation est informative et ne constitue ni une décision ni une garantie de financement.

========================
RÈGLES STRICTES
========================
- Ne retourne JAMAIS de titre.
- Ne retourne JAMAIS de markdown.
- Ne retourne JAMAIS de listes.
- Commence directement par le premier paragraphe.
- Ton ton doit être professionnel, clair, pédagogique et orienté accompagnement.

Interprétation:`;

      // Create abort controller with 30-second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert financier spécialisé dans l\'évaluation de crédit. Tu fournis des interprétations détaillées, personnalisées et honnêtes des scores d\'éligibilité basées sur les données RÉELLES fournies par l\'utilisateur. Tu dois toujours clarifie que c\'est une interprétation professionnelle et non une garantie d\'approbation du crédit.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: controller.signal
      }) as any;

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ OpenAI API error:", error);
        throw new AppError(`Erreur OpenAI: ${error.error?.message || 'Erreur inconnue'}`, 500);
      }

      const data = await response.json();
      let interpretation = data.choices?.[0]?.message?.content || '';

      // Remove any markdown headers that might have been added
      interpretation = interpretation.replace(/^#+\s+.+?\n*/gm, '').trim();

      console.log("✅ LLM interpretation generated for score:", score);
      
      res.json({
        score,
        classification,
        interpretation: interpretation
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur interprétation score:", error);
      res.status(500).json({ error: "Erreur lors de la génération de l'interprétation" });
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
        .select("id, name, weight, min_value, max_value, favorable_direction, is_blocking, variable_type, unit")
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

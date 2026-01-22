import { Router } from "express";
import { simulationsController } from "../controllers/simulations.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// POST /api/simulations/calculate - PUBLIC endpoint pour calculer le score
router.post("/calculate", simulationsController.calculateScore);

// POST /api/simulations/interpret - PUBLIC endpoint pour interpréter un score via LLM
router.post("/interpret", simulationsController.interpretScore);

// More specific routes FIRST (with /stats)
// GET /api/simulations/product/:productId/stats - PUBLIC endpoint pour les stats d'un produit
router.get("/product/:productId/stats", simulationsController.getProductSimulationStats);

// GET /api/simulations/institution/:institutionId/stats - PROTECTED endpoint pour récupérer les stats d'une institution
router.get("/institution/:institutionId/stats", authMiddleware, simulationsController.getInstitutionSimulationStats);

// More general routes AFTER specific ones
// GET /api/simulations/product/:productId - PUBLIC endpoint pour récupérer les variables d'un produit
router.get("/product/:productId", simulationsController.getProductVariables);

// GET /api/simulations/institution/:institutionId - PROTECTED endpoint pour récupérer les simulations d'une institution
router.get("/institution/:institutionId", authMiddleware, simulationsController.getInstitutionSimulations);

export default router;

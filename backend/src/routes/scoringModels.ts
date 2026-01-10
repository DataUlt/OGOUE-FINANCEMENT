import { Router } from "express";
import { scoringModelsController } from "../controllers/scoringModels.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.use(requireRole(["institution"]));

// Create a new scoring model
router.post("/", scoringModelsController.createModel);

// Get all models for institution
router.get("/", scoringModelsController.getInstitutionModels);

// Get a single model
router.get("/:id", scoringModelsController.getModel);

// Update a model
router.put("/:id", scoringModelsController.updateModel);

// Delete a model
router.delete("/:id", scoringModelsController.deleteModel);

export default router;

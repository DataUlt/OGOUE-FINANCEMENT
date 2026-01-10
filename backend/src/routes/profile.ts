import { Router } from "express";
import { profileController } from "../controllers/profile.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Get all institutions (public route - no auth needed)
router.get("/institutions", profileController.getAllInstitutions);

router.use(authMiddleware);

// Institution profile
router.get("/institution", profileController.getInstitutionProfile);
router.put("/institution", profileController.updateInstitutionProfile);

// PME profile
router.get("/pme", profileController.getPMEProfile);
router.put("/pme", profileController.updatePMEProfile);

export default router;

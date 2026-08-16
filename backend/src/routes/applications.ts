import { Router } from "express";
import { applicationsController } from "../controllers/applications.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

// Seule une institution instruit des dossiers.
router.use(authMiddleware, requireRole(["institution"]));

router.get("/", applicationsController.list);
router.get("/:id", applicationsController.getOne);
router.patch("/:id/status", applicationsController.updateStatus);

export default router;

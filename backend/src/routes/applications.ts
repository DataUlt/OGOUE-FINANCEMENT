import { Router } from "express";
import { applicationsController } from "../controllers/applications.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

// Seule une institution instruit des dossiers.
router.use(authMiddleware, requireRole(["institution"]));

router.get("/", applicationsController.list);
router.get("/:id", applicationsController.getOne);
router.get("/:id/documents/:docId/url", applicationsController.getDocumentUrl);
router.patch("/:id/status", applicationsController.updateStatus);
// Discussion du dossier (texte et piece jointe)
router.get("/:id/messages", applicationsController.listMessages);
router.post("/:id/messages", applicationsController.postMessage);
router.get("/:id/messages/:msgId/attachment", applicationsController.getMessageAttachment);

export default router;

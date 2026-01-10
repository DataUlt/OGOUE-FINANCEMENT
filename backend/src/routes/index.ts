import { Router } from "express";
import { authController } from "../controllers/auth.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.getCurrentUser);
router.post("/logout", authMiddleware, authController.logout);
router.post("/upload-logo", authController.uploadLogo);

export default router;

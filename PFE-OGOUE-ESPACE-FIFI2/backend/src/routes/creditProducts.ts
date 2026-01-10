import { Router } from "express";
import { creditProductsController } from "../controllers/creditProducts.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

// Public routes (no auth required) - defined first for specificity
router.get("/public/all", creditProductsController.getAllActiveProducts);
router.get("/public/:id", creditProductsController.getProductForSimulation);
router.get("/public/institution/:institutionId", creditProductsController.getProductsByInstitution);

// Protected routes (auth required)
router.get("/typologies", authMiddleware, creditProductsController.getTypologies);
router.get("/", authMiddleware, creditProductsController.getInstitutionProducts);
router.get("/:id", authMiddleware, creditProductsController.getProduct);
router.post("/", authMiddleware, requireRole(["institution"]), creditProductsController.createProduct);
router.put("/:id", authMiddleware, requireRole(["institution"]), creditProductsController.updateProduct);
router.delete("/:id", authMiddleware, requireRole(["institution"]), creditProductsController.deleteProduct);

export default router;

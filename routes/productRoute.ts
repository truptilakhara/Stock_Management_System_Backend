import express from "express";

import {
    createProduct,
    getProducts,
    getProductById,
    updateProductById,
    deleteProductById
} from "../controllers/productController";

import { authenticate, authorize } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/createProduct", authenticate, authorize("owner"), createProduct);

router.get("/getAllProducts", authenticate, getProducts);

router.get("/:id", authenticate, getProductById);

router.put("/:id", authenticate, authorize("owner"), updateProductById);

router.delete("/:id", authenticate, authorize("owner"), deleteProductById);

export default router;
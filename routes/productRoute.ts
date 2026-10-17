import express from "express";

import {
    createProduct,
    getProducts,
    getProductById,
    updateProductById,
    deleteProductById
} from "../controllers/productController";

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/createProduct", authenticate, createProduct);

router.get("/getAllProducts", authenticate, getProducts);

router.get("/:id", authenticate, getProductById);

router.put("/:id", authenticate, updateProductById);

router.delete("/:id", authenticate, deleteProductById);

export default router;
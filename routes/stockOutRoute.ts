import express from "express";

import { getStockOutHistory, stockOut } from "../controllers/stockOutController";

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticate, stockOut);
router.get("/getStockOutHistory", authenticate, getStockOutHistory)

export default router;
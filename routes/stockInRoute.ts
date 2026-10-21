import express from "express";

import { getStockInHistory, stockIn } from "../controllers/stockInController";

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticate, stockIn);
router.get("/getStockInHistory", authenticate, getStockInHistory)

export default router;
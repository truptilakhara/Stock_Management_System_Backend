import express from "express";
import {
    getStockInReport,
    getStockOutReport,
    getTransactionReport
} from "../controllers/reportController";
import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/stock-in", authenticate, getStockInReport);
router.get("/stock-out", authenticate, getStockOutReport);
router.get("/transactions", authenticate, getTransactionReport);

export default router;
import express from "express";
import {
    getStockInReport,
    getStockOutReport,
    getReportSummary,
    getSalesTrend,
    getTransactionReport
} from "../controllers/reportController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/summary", authenticate, authorize("owner"), getReportSummary);
router.get("/sales-trend", authenticate, authorize("owner"), getSalesTrend);
router.get("/stock-in", authenticate, authorize("owner"), getStockInReport);
router.get("/stock-out", authenticate, authorize("owner"), getStockOutReport);
router.get("/transactions", authenticate, authorize("owner"), getTransactionReport);

export default router;
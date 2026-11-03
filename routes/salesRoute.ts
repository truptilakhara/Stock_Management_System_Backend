import express from "express";

import { cancelSale, createSale, getSales } from "../controllers/salesController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticate, createSale);
router.get("/getSales", authenticate, getSales);
router.patch("/:id/cancel", authenticate, authorize("owner"), cancelSale);

export default router;

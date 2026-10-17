import express from "express";

import { stockIn } from "../controllers/stockInController";

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticate, stockIn);

export default router;
import express from "express";

import { stockOut } from "../controllers/stockOutController";

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticate, stockOut);

export default router;
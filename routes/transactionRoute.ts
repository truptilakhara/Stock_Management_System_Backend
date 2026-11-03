import express from "express";

import {
    getTransactions,
    getTransactionById
} from "../controllers/transactionContoller"

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authenticate, getTransactions);

router.get("/:id", authenticate, getTransactionById);

export default router;

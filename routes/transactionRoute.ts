import express from "express";

import {
    createTransaction,
    getTransactions,
    getTransactionById,
    deleteTransactionById
} from "../controllers/transactionContoller"

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticate, createTransaction);

router.get("/", authenticate, getTransactions);

router.get("/:id", authenticate, getTransactionById);

router.delete("/:id", authenticate, deleteTransactionById);

export default router;
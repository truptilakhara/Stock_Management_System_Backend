import { Request, Response } from "express";
import Transaction from "../models/transactions";

// The transaction ledger is written only by Stock In, Stock Out and Billing,
// which also keep product stock in sync. Records are read-only here.

// GET TRANSACTIONS (optional ?type=stock-in|stock-out&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=)
export const getTransactions = async (req: Request, res: Response) => {
    try {
        const OFFSET_MS = 330 * 60 * 1000; // India time
        const filter: Record<string, unknown> = {};

        const { type, from, to } = req.query;

        if (type === "stock-in" || type === "stock-out") {
            filter.type = type;
        }

        const dayStart = (value: unknown) => {
            if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
            const [y, m, d] = value.split("-").map(Number);
            return new Date(Date.UTC(y, m - 1, d) - OFFSET_MS);
        };

        const start = dayStart(from);
        const endDay = dayStart(to);
        if (start || endDay) {
            const range: Record<string, Date> = {};
            if (start) range.$gte = start;
            if (endDay) range.$lt = new Date(endDay.getTime() + 24 * 60 * 60 * 1000);
            filter.createdAt = range;
        }

        const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2000);

        const [transactions, total] = await Promise.all([
            Transaction.find(filter)
                .populate("product", "-purchasePrice -serialNumbers")
                .populate("supplier")
                .populate("createdBy", "-password")
                .sort({ createdAt: -1 })
                .limit(limit),
            Transaction.countDocuments(filter),
        ]);

        return res.status(200).json({
            message: "Transactions fetched successfully.",
            data: transactions,
            total
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// GET TRANSACTION BY ID
export const getTransactionById = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id)
            .populate("product", "-purchasePrice -serialNumbers")
            .populate("supplier")
            .populate("createdBy", "-password");

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found."
            });
        }

        return res.status(200).json({
            message: "Transaction fetched successfully.",
            data: transaction
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

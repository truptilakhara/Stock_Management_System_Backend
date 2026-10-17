import { Request, Response } from "express";
import Transaction from "../models/transactions";

export const getStockInReport = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find({
            type: "stock-in"
        })
            .populate("product")
            .populate("createdBy", "-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Stock-in report fetched successfully.",
            data: transactions
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

export const getStockOutReport = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find({
            type: "stock-out"
        })
            .populate("product")
            .populate("createdBy", "-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Stock-out report fetched successfully.",
            data: transactions
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

export const getTransactionReport = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find()
            .populate("product")
            .populate("createdBy", "-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Transaction report fetched successfully.",
            data: transactions
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};
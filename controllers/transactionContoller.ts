import { Request, Response } from "express";
import Transaction from "../models/transactions";
import Product from "../models/products";


// CREATE TRANSACTION
export const createTransaction = async (req: Request, res: Response) => {
    try {
        const {
            product,
            type,
            quantity,
            reason,
            reference
        } = req.body;

        if (!product || !type || !quantity) {
            return res.status(400).json({
                message: "Product, type and quantity are required."
            });
        }

        if (!["stock-in", "stock-out"].includes(type)) {
            return res.status(400).json({
                message: "Transaction type must be stock-in or stock-out."
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be at least 1."
            });
        }

        const existingProduct = await Product.findById(product);

        if (!existingProduct) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated."
            });
        }

        const transaction = await Transaction.create({
            product,
            type,
            quantity,
            reason,
            reference,
            createdBy: userId
        });

        return res.status(201).json({
            message: "Transaction created successfully.",
            data: transaction
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// GET ALL TRANSACTIONS
export const getTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find()
            .populate("product")
            .populate("createdBy", "-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Transactions fetched successfully.",
            data: transactions
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
            .populate("product")
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


// DELETE TRANSACTION
export const deleteTransactionById = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        const deletedTransaction =
            await Transaction.findByIdAndDelete(id);

        if (!deletedTransaction) {
            return res.status(404).json({
                message: "Transaction not found."
            });
        }

        return res.status(200).json({
            message: "Transaction deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};
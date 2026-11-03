import { Request, Response } from "express";
import Product from "../models/products";
import Transaction from "../models/transactions";
import { deductStock } from "../utils/stock";
import { normalizeSerials } from "../utils/serials";
import { present } from "./productController";

export const stockOut = async (req: Request, res: Response) => {
    try {
        const { product, reason, reference } = req.body;
        const quantity = Number(req.body.quantity);

        // Validate required fields
        if (!product || !req.body.quantity) {
            return res.status(400).json({
                message: "Product and quantity are required."
            });
        }

        // Validate quantity
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a whole number of at least 1."
            });
        }

        const { serials, error: serialError } = normalizeSerials(req.body.serialNumbers);
        if (serialError) {
            return res.status(400).json({ message: serialError });
        }

        // Get logged-in user
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated."
            });
        }

        // Decrease stock atomically, so two sales can't both take the last units.
        const result = await deductStock(product, quantity, serials);

        if (!result.ok) {
            return res.status(result.status).json({ message: result.message });
        }
        const existingProduct = (await Product.findById(product))!;

        // Create transaction record
        const transaction = await Transaction.create({
            product: existingProduct._id,
            type: "stock-out",
            quantity,
            reason,
            reference,
            serialNumbers: serials,
            createdBy: userId
        });

        return res.status(201).json({
            message: "Stock removed successfully.",
            data: {
                product: present(existingProduct, req),
                transaction
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};
export const getStockOutHistory = async (
    req: Request,
    res: Response
) => {
    try {
        const filter = { type: "stock-out" as const };

        // Fetch the latest 50 records for the table
        const transactions = await Transaction.find(filter)
            .populate("product", "-purchasePrice -serialNumbers")
            .populate("supplier")
            .sort({ createdAt: -1 })
            .limit(50);

        // Count ALL stock-out records, not just the latest 50
        const totalRecords = await Transaction.countDocuments(filter);

        // Calculate total quantity removed across ALL records
        const quantitySummary = await Transaction.aggregate([
            { $match: { type: "stock-out" } },
            {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: "$quantity" },
                },
            },
        ]);

        // Calculate quantity removed today (India timezone)
        const now = new Date();
        const indiaDate = new Date(
            now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
        );

        const startOfDay = new Date(indiaDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        // Convert India-local day boundaries to UTC
        const utcOffset = 330 * 60 * 1000;
        const startUtc = new Date(startOfDay.getTime() - utcOffset);
        const endUtc = new Date(endOfDay.getTime() - utcOffset);

        const todaySummary = await Transaction.aggregate([
            {
                $match: {
                    type: "stock-out",
                    createdAt: { $gte: startUtc, $lt: endUtc },
                },
            },
            {
                $group: {
                    _id: null,
                    todayQuantity: { $sum: "$quantity" },
                },
            },
        ]);

        return res.status(200).json({
            message: "Stock-out history fetched successfully.",
            data: transactions,
            summary: {
                totalRecords,
                totalQuantity: quantitySummary[0]?.totalQuantity ?? 0,
                todayQuantity: todaySummary[0]?.todayQuantity ?? 0,
            },
        });
    } catch (error) {
        console.error("Failed to fetch stock-out history:", error);

        return res.status(500).json({
            message: "Failed to fetch stock-out history.",
        });
    }
};
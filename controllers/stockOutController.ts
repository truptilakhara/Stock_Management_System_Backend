import { Request, Response } from "express";
import Product from "../models/products";
import Transaction from "../models/transactions";

export const stockOut = async (req: Request, res: Response) => {
    try {
        const { product, quantity, reason, reference } = req.body;

        // Validate required fields
        if (!product || !quantity) {
            return res.status(400).json({
                message: "Product and quantity are required."
            });
        }

        // Validate quantity
        if (quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be at least 1."
            });
        }

        // Find product
        const existingProduct = await Product.findById(product);

        if (!existingProduct) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        // Check available stock
        if (existingProduct.quantity < quantity) {
            return res.status(400).json({
                message: "Insufficient stock available."
            });
        }

        // Get logged-in user
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated."
            });
        }

        // Decrease product quantity
        existingProduct.quantity -= quantity;
        await existingProduct.save();

        // Create transaction record
        const transaction = await Transaction.create({
            product: existingProduct._id,
            type: "stock-out",
            quantity,
            reason,
            reference,
            createdBy: userId
        });

        return res.status(201).json({
            message: "Stock removed successfully.",
            data: {
                product: existingProduct,
                transaction
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};
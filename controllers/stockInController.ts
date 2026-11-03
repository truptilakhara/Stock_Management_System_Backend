import { Request, Response } from "express";
import Product from "../models/products"
import Transaction from "../models/transactions"
import { present } from "./productController"
import Sale from "../models/sales"
import { normalizeSerials } from "../utils/serials"

export const stockIn = async (req: Request, res: Response) => {
    try {
        const { product, reason, reference } = req.body
        const quantity = Number(req.body.quantity)
        if (!product || !req.body.quantity) {
            return res.status(400).json({ message: "Product and quantity are required." })
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: "Quantity must be a whole number of at least 1." })
        }
        const { serials, error: serialError } = normalizeSerials(req.body.serialNumbers)
        if (serialError) {
            return res.status(400).json({ message: serialError })
        }
        if (serials.length > 0 && serials.length !== quantity) {
            return res.status(400).json({
                message: `Enter ${quantity} serial number${quantity === 1 ? "" : "s"} or leave them all blank (you entered ${serials.length}).`
            })
        }
        const existingProduct = await Product.findById(product)
        if (!existingProduct) {
            return res.status(404).json({
                message: "Product not found."
            });
        }
        const userId = (req as any).user?.id
        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated."
            });
        }
        if (serials.length > 0) {
            const inStock = await Product.findOne({ serialNumbers: { $in: serials } }).select("productName serialNumbers")
            if (inStock) {
                const clash = serials.find((s) => inStock.serialNumbers.includes(s))
                return res.status(409).json({ message: `Serial number ${clash} is already in stock (${inStock.productName}).` })
            }
            const sold = await Sale.findOne({ status: "completed", "items.serialNumbers": { $in: serials } }).select("invoiceNumber items.serialNumbers")
            if (sold) {
                const clash = serials.find((s) => sold.items.some((i) => i.serialNumbers?.includes(s)))
                return res.status(409).json({ message: `Serial number ${clash} was already sold on ${sold.invoiceNumber}.` })
            }
        }
        // Atomic increment so concurrent updates can't overwrite each other.
        const update: Record<string, unknown> = { $inc: { quantity } }
        if (serials.length > 0) update.$addToSet = { serialNumbers: { $each: serials } }
        await Product.updateOne({ _id: existingProduct._id }, update);
        existingProduct.quantity += quantity;
        if (serials.length > 0) existingProduct.serialNumbers = [...existingProduct.serialNumbers, ...serials];

        // Create transaction
        const transaction = await Transaction.create({
            product: existingProduct._id,
            type: "stock-in",
            supplier: existingProduct.supplier,
            quantity,
            reason,
            reference,
            serialNumbers: serials,
            createdBy: userId
        });

        return res.status(201).json({
            message: "Stock added successfully.",
            data: {
                product: present(existingProduct, req),
                transaction
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error." })
    }
}
export const getStockInHistory = async (
    req: Request,
    res: Response
) => {
    try {
        const transactions = await Transaction.find({
            type: "stock-in",
        })
            .populate("product", "-purchasePrice -serialNumbers").populate("supplier")
            .sort({ createdAt: -1 })
            .limit(50);
        return res.status(200).json({
            message: "Stock-in history fetched successfully.",
            data: transactions,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch stock-in history.",
        });
    }
};

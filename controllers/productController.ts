import { Request, Response } from "express";
import Product from "../models/products";

// Staff must never see what a product cost; only owners get purchasePrice.
export function present(product: any, req: Request) {
    const obj = typeof product.toObject === "function" ? product.toObject() : { ...product };
    if ((req as any).user?.role !== "owner") delete obj.purchasePrice;
    return obj;
}

// CREATE PRODUCT
export const createProduct = async (req: Request, res: Response) => {
    try {
        const {
            productName,
            quantity,
            minimumStock,
            purchasePrice,
            sellingPrice,
            brand,
            description,
            category,
            supplier
        } = req.body;

        // Check required fields
        if (
            !productName ||
            purchasePrice === undefined ||
            sellingPrice === undefined ||
            !category ||
            !supplier
        ) {
            return res.status(400).json({
                message: "Product name, purchase price, selling price, category and supplier are required."
            });
        }

        // Create product
        const product = await Product.create({
            productName,
            quantity,
            minimumStock,
            purchasePrice,
            sellingPrice,
            brand,
            description,
            category,
            supplier
        });

        return res.status(201).json({
            message: "Product created successfully.",
            data: present(product, req)
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// GET ALL PRODUCTS
export const getProducts = async (req: Request, res: Response) => {
    try {
        const allProducts = await Product.find()
            .populate("category")
            .populate("supplier");

        return res.status(200).json({
            message: "Fetched successfully.",
            data: allProducts.map((p) => present(p, req))
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// GET PRODUCT BY ID
export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id)
            .populate("category")
            .populate("supplier");

        if (!product) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.status(200).json({
            message: "Fetched successfully.",
            data: present(product, req)
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// UPDATE PRODUCT
export const updateProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Serial numbers are managed through Stock In / Stock Out / Billing only.
        const { serialNumbers: _ignored, sku: _sku, ...data } = req.body;

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            data,
            {
                new: true,
                runValidators: true
            }
        )
            .populate("category")
            .populate("supplier");

        if (!updatedProduct) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.status(200).json({
            message: "Product updated successfully.",
            data: present(updatedProduct, req)
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// DELETE PRODUCT
export const deleteProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.status(200).json({
            message: "Product deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};
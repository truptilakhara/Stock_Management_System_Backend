import { Request, Response } from "express";
import Product from "../models/products";

// CREATE PRODUCT
export const createProduct = async (req: Request, res: Response) => {
    try {
        const {
            productName,
            sku,
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
            !sku ||
            purchasePrice === undefined ||
            sellingPrice === undefined ||
            !category ||
            !supplier
        ) {
            return res.status(400).json({
                message: "Product name, SKU, purchase price, selling price, category and supplier are required."
            });
        }

        // Check duplicate SKU
        const existingProduct = await Product.findOne({ sku });

        if (existingProduct) {
            return res.status(409).json({
                message: "Product with this SKU already exists."
            });
        }

        // Create product
        const product = await Product.create({
            productName,
            sku,
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
            data: product
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
            data: allProducts
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
            data: product
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
        const data = req.body;

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
            data: updatedProduct
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
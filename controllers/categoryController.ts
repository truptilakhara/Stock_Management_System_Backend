import { Request, Response } from "express";
import Category from "../models/categories";
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body
        const categoryName = name.trim()
        if (!categoryName) {
            return res.status(400).json({ message: "Category name is required." })
        }
        const existingCategory = await Category.findOne({ name: categoryName })
        if (existingCategory) {
            return res.status(409).json({ message: "Category already exists" })
        }
        const category = await Category.create({ name: categoryName, description })
        return res.status(201).json({ message: "Category created successfully.", data: category })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export const getCategories = async (req: Request, res: Response) => {
    try {
        const allCategories = await Category.find({})
        return res.status(200).json({ message: "Fetched successfully.", data: allCategories })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error." })
    }
}

export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const category = await Category.findById(id)
        if (!category) {
            return res.status(404).json({ message: "Id is invalid" })
        }
        return res.status(200).json({ message: "Fetched successfully.", data: category })
    } catch (error) { return res.status(500).json({ message: "Internal server error." }) }
}
export const updateCategoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const data = req.body
        const updatedCategory = await Category.findByIdAndUpdate(id, data, { new: true })
        if (!updatedCategory) {
            return res.status(404).json({
                message: "Category not found"
            })
        }
        return res.status(200).json({ message: "Updated successfully.", data: updatedCategory })
    } catch (error) {
        return res.status(500).json("Internal server error.")
    }
}
export const deleteByCategoryId = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const deleteByCategoryId = await Category.findByIdAndDelete(id)
        if (!deleteByCategoryId) {
            return res.status(404).json({
                message: "Category not found"
            })
        }
        return res.status(200).json({ message: "Deleted successfully" })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error." })
    }
}
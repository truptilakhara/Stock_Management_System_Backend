import { Request, Response } from "express";
import Supplier from "../models/suppliers"
export const createSupplier = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, address, companyName } = req.body
        if (!name || !phone || !email || !address || !companyName) {
            return res.status(400).json({ message: "Name, phone ,email address or company name is required." })
        }
        const supplier = (await Supplier.create({ name, email, phone, address, companyName }))
        return res.status(201).json({ message: "Created successfully.", data: supplier })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error." })
    }
}
export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const allSuppliers = await Supplier.find({})
        return res.status(200).json({ message: "Fetched successfully.", data: allSuppliers })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error." })
    }
}
export const getSupplierById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const supplier = await Supplier.findById(id)
        if (!supplier) {
            return res.status(404).json({ message: "Id is invalid" })
        }
        return res.status(200).json({ message: "Fetched successfully.", data: supplier })
    } catch (error) { return res.status(500).json({ message: "Internal server error." }) }
}
export const updateSupplierById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const data = req.body
        const updatedSupplier = await Supplier.findByIdAndUpdate(id, data, { new: true })
        if (!updatedSupplier) {
            return res.status(404).json({
                message: "Supplier not found"
            })
        }
        return res.status(200).json({ message: "Updated successfully.", data: updatedSupplier })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error." })
    }
}
export const deleteBySupplierId = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const deleteBySupplierId = await Supplier.findByIdAndDelete(id)
        if (!deleteBySupplierId) {
            return res.status(404).json({
                message: "Supplier not found"
            })
        }
        return res.status(200).json({ message: "Deleted successfully" })
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error." })
    }
}
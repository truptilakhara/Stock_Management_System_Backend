import express from "express"
import { createSupplier, deleteBySupplierId, getSupplierById, getSuppliers, updateSupplierById } from "../controllers/supllierController"
import { authenticate } from "../middleware/authMiddleware"
const router = express.Router()
router.use(authenticate)
router.post("/createSupplier", createSupplier)
router.get("/getSuppliers", getSuppliers)
router.get("/:id", getSupplierById)
router.put("/:id", updateSupplierById)
router.delete("/:id", deleteBySupplierId)
export default router
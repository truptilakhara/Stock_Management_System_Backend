import express from "express"
import { createCategory, deleteByCategoryId, getCategories, getCategoryById, updateCategoryById } from "../controllers/categoryController"
const router = express.Router()
router.post("/createCategory", createCategory)
router.get("/getCategories", getCategories)
router.get("/:id", getCategoryById)
router.put("/:id", updateCategoryById)
router.delete("/:id", deleteByCategoryId)
export default router
import express from "express"
import { createCategory, deleteByCategoryId, getCategories, getCategoryById, updateCategoryById } from "../controllers/categoryController"
import { authenticate, authorize } from "../middleware/authMiddleware"
const router = express.Router()
router.use(authenticate)
router.post("/createCategory", createCategory)
router.get("/getCategories", getCategories)
router.get("/:id", getCategoryById)
router.put("/:id", authorize("owner"), updateCategoryById)
router.delete("/:id", authorize("owner"), deleteByCategoryId)
export default router
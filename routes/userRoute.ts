import express from "express";

import {
    getUsers,
    getUserById,
    updateUserById,
    deleteUserById
} from "../controllers/userController";

import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authenticate, getUsers);

router.get("/:id", authenticate, getUserById);

router.put("/:id", authenticate, updateUserById);

router.delete("/:id", authenticate, deleteUserById);

export default router;
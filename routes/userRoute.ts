import express from "express";

import {
    getUsers,
    getUserById,
    createUser,
    updateUserById,
    deleteUserById
} from "../controllers/userController";

import { authenticate, authorize } from "../middleware/authMiddleware";

const router = express.Router();

// Managing users is an owner-only job.
router.get("/", authenticate, authorize("owner"), getUsers);

router.post("/", authenticate, authorize("owner"), createUser);

router.get("/:id", authenticate, authorize("owner"), getUserById);

router.put("/:id", authenticate, authorize("owner"), updateUserById);

router.delete("/:id", authenticate, authorize("owner"), deleteUserById);

export default router;

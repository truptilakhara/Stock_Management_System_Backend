import express from "express";
import { getMe, googleSignIn, signIn, signUp, updateMe } from "../controllers/authController";
import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn)
router.post("/google", googleSignIn)
router.get("/me", authenticate, getMe)
router.put("/me", authenticate, updateMe)
export default router;
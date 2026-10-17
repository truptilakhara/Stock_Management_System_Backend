import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
export const signUp = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required",
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "staff",
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const signIn = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body
        console.log({ email, password })
        if (!email || !password) {
            res.status(400).json({ message: "Email and Password are required." })
        }
        const user = await User.findOne({ email })
        if (!user) {
            res.status(401).json({ message: "Invalid Email and Password." })
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user?.password
        );
        const token = jwt.sign(
            {
                id: user?._id,
                role: user?.role,
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "1d",
            }
        );
        if (!isPasswordValid) {
            res.status(401).json({ message: "Invalid Email or  Password." })
        }
        res.status(200).json({
            message: "Signin successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    }
    catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const googleSignIn = async (req: Request, res: Response) => {
    try {
        const { credential } = req.body
        if (!credential) {
            return res.status(400).json({ message: "Google credential is required", })
        }
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            return res.status(401).json({
                message: "Google email is not verified",
            });
        }
        if (!payload) {
            return res.status(401).json({
                message: "Invalid Google token",
            });
        }
        const {
            sub: googleId,
            email,
            name,
        } = payload;
        if (!email || !name || !googleId) {
            return res.status(400).json({
                message: "Google account information is incomplete",
            });
        }
        let user = await User.findOne({ googleId });

        if (!user) {
            user = await User.findOne({ email });

            if (user) {
                return res.status(409).json({
                    message:
                        "An account with this email already exists. Please sign in with your password first.",
                });
            }

            user = await User.create({
                name,
                email,
                googleId,
                role: "staff",
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "1d",
            }
        );

        return res.status(200).json({
            message: "Google signin successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }

    catch (error) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        console.log({ userId })
        const user = await User.findById(userId).select("-password")
        if (!user) {
            return res.status(404).json({ message: "User not found." })
        }
        return res.status(200).json({ message: "User Fetched Successfully", user })

    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error." })
    }
}
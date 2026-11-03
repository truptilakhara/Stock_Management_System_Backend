import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
export const signUp = async (req: Request, res: Response) => {
    try {
        const { name, password, role } = req.body;
        const email = String(req.body.email ?? "").trim().toLowerCase();

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required",
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters.",
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        // Anyone can reach this route, so only the very first account may
        // become an owner. Later owners are promoted by an existing owner.
        if (role === "owner" && (await User.exists({ role: "owner" }))) {
            return res.status(403).json({
                message:
                    "An owner already exists. Ask the owner to give you the owner role.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role === "owner" ? "owner" : "staff",
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
            message: error instanceof Error ? error.message : "Internal server error",
        });
    }
};

export const signIn = async (req: Request, res: Response) => {
    try {
        const { password } = req.body;
        const email = String(req.body.email ?? "").trim().toLowerCase();

        if (!email || !password) {
            return res.status(400).json({ message: "Email and Password are required." });
        }

        const user = await User.findOne({ email });

        // Google-only accounts have no password.
        if (!user || !user.password) {
            return res.status(401).json({ message: "Invalid Email or Password." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid Email or Password." });
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
        console.error("Sign in failed:", error);
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
            picture,
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
                avatar: picture,
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

const toProfile = (user: any) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? "",
    hasPassword: Boolean(user.password),
});

export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found." })
        }
        return res.status(200).json({ message: "User Fetched Successfully", user: toProfile(user) })

    }
    catch (error) {
        return res.status(500).json({ message: "Internal Server Error." })
    }
}

// Lets any signed-in user edit their own name, picture and password.
export const updateMe = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const { name, avatar, currentPassword, newPassword } = req.body;

        if (name !== undefined) {
            const trimmed = String(name).trim();
            if (!trimmed) {
                return res.status(400).json({ message: "Name cannot be empty." });
            }
            user.name = trimmed;
        }

        if (avatar !== undefined) {
            if (avatar === "" || avatar === null) {
                user.avatar = undefined;
            } else if (
                typeof avatar === "string" &&
                /^data:image\/(jpeg|png|webp);base64,/.test(avatar) &&
                avatar.length <= 200_000
            ) {
                user.avatar = avatar;
            } else {
                return res.status(400).json({ message: "Profile picture must be a small JPG, PNG or WebP image." });
            }
        }

        if (newPassword) {
            if (String(newPassword).length < 6) {
                return res.status(400).json({ message: "New password must be at least 6 characters." });
            }
            // Accounts that already have a password must prove they know it.
            if (user.password) {
                const ok = currentPassword && (await bcrypt.compare(String(currentPassword), user.password));
                if (!ok) {
                    return res.status(400).json({ message: "Current password is incorrect." });
                }
            }
            user.password = await bcrypt.hash(String(newPassword), 10);
        }

        await user.save();

        return res.status(200).json({ message: "Profile updated.", user: toProfile(user) });
    } catch (error) {
        console.error("Failed to update profile:", error);
        return res.status(500).json({ message: "Internal Server Error." });
    }
}

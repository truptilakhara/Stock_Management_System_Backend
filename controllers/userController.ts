import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user";

const ROLES = ["owner", "staff"];
const isDuplicateKey = (error: unknown) =>
    typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

// GET ALL USERS
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Users fetched successfully.",
            data: users
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// GET USER BY ID
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.status(200).json({
            message: "User fetched successfully.",
            data: user
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// CREATE USER (owner adds a staff member or another owner)
export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, password, role } = req.body;
        const email = String(req.body.email ?? "").trim().toLowerCase();

        if (!name?.trim() || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required."
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters."
            });
        }

        if (role && !ROLES.includes(role)) {
            return res.status(400).json({ message: "Role must be owner or staff." });
        }

        if (await User.exists({ email })) {
            return res.status(409).json({ message: "A user with this email already exists." });
        }

        const user = await User.create({
            name: name.trim(),
            email,
            password: await bcrypt.hash(password, 10),
            role: role ?? "staff"
        });

        return res.status(201).json({
            message: "User created successfully.",
            data: { _id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        if (isDuplicateKey(error)) {
            return res.status(409).json({ message: "A user with this email already exists." });
        }
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// UPDATE USER
export const updateUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, role, password } = req.body;
        const email = req.body.email === undefined
            ? undefined
            : String(req.body.email).trim().toLowerCase();

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (role !== undefined && !ROLES.includes(role)) {
            return res.status(400).json({ message: "Role must be owner or staff." });
        }

        // Never leave the system without an owner.
        if (role === "staff" && user.role === "owner") {
            const owners = await User.countDocuments({ role: "owner" });
            if (owners <= 1) {
                return res.status(400).json({
                    message: "There must be at least one owner."
                });
            }
        }

        if (password !== undefined && password !== "") {
            if (String(password).length < 6) {
                return res.status(400).json({
                    message: "Password must be at least 6 characters."
                });
            }
            user.password = await bcrypt.hash(password, 10);
        }

        if (name !== undefined) user.name = String(name).trim();
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;

        await user.save();

        return res.status(200).json({
            message: "User updated successfully.",
            data: { _id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        if (isDuplicateKey(error)) {
            return res.status(409).json({ message: "A user with this email already exists." });
        }
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// DELETE USER
export const deleteUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (id === (req as any).user?.id) {
            return res.status(400).json({
                message: "You cannot delete your own account."
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (user.role === "owner" && (await User.countDocuments({ role: "owner" })) <= 1) {
            return res.status(400).json({
                message: "There must be at least one owner."
            });
        }

        await user.deleteOne();

        return res.status(200).json({
            message: "User deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

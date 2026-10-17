import { Request, Response } from "express";
import User from "../models/user";

// GET ALL USERS
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select("-password");

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


// UPDATE USER
export const updateUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { name, email, role } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            {
                name,
                email,
                role
            },
            {
                new: true,
                runValidators: true
            }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.status(200).json({
            message: "User updated successfully.",
            data: updatedUser
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};


// DELETE USER
export const deleteUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.status(200).json({
            message: "User deleted successfully."
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};
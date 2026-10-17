import { Document, Schema, model } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: "owner" | "staff";
    googleId?: string
}

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: false,
        },

        role: {
            type: String,
            required: true,
            enum: ["owner", "staff"],
            default: "staff",
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true
        }
    },
    {
        timestamps: true,
    }
);

export default model<IUser>("User", userSchema);
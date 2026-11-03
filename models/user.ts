import { Document, Schema, model } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: "owner" | "staff";
    googleId?: string;
    avatar?: string;
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
        },
        // Small profile picture stored as a data URL (or a Google picture URL).
        avatar: {
            type: String,
            required: false,
        }
    },
    {
        timestamps: true,
    }
);

export default model<IUser>("User", userSchema);
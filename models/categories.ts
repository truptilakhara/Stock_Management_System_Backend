import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    name: string;
    description?: string;
}

const categorySchema = new Schema<ICategory>(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },

    },
    {
        timestamps: true,
    }
);

export default mongoose.model<ICategory>("Category", categorySchema);
import { Document, Schema, model, Types } from "mongoose";

export interface IProduct extends Document {
    productName: string;
    serialNumbers: string[];
    quantity: number;
    minimumStock: number;
    purchasePrice: number;
    sellingPrice: number;
    brand?: string;
    description?: string;
    category: Types.ObjectId;
    supplier: Types.ObjectId;
}

const productSchema = new Schema<IProduct>(
    {
        productName: {
            type: String,
            required: true,
            trim: true,
        },

        // One entry per unit in stock. Shown only in Billing / Stock In / Stock Out.
        serialNumbers: {
            type: [String],
            default: [],
            index: true,
        },

        quantity: {
            type: Number,
            required: true,
            default: 0,
        },

        minimumStock: {
            type: Number,
            required: true,
            default: 0,
        },

        purchasePrice: {
            type: Number,
            required: true,
        },

        sellingPrice: {
            type: Number,
            required: true,
        },

        brand: {
            type: String,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        supplier: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default model<IProduct>("Product", productSchema);
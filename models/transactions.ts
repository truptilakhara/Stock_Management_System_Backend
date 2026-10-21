import { Document, model, Schema, Types } from "mongoose";

export interface ITransaction extends Document {
    product: Types.ObjectId;
    type: "stock-in" | "stock-out";
    quantity: number;
    reason?: string;
    reference?: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    supplier?: Types.ObjectId
}

const transactionSchema = new Schema<ITransaction>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        supplier: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
            required: false,
        },
        type: {
            type: String,
            enum: ["stock-in", "stock-out"],
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        reason: {
            type: String,
            trim: true,
        },

        reference: {
            type: String,
            trim: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default model<ITransaction>("Transaction", transactionSchema);
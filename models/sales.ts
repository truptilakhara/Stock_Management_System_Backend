import { Document, Schema, model, Types } from "mongoose";

export interface ISaleItem {
    product: Types.ObjectId;
    productName: string;
    serialNumbers: string[];
    quantity: number;
    price: number;
    lineTotal: number;
}

export interface ISale extends Document {
    invoiceNumber: string;
    items: ISaleItem[];
    customerName?: string;
    customerPhone?: string;
    subtotal: number;
    discount: number;
    taxPercent: number;
    taxAmount: number;
    total: number;
    paymentMethod: "Cash" | "UPI" | "Card";
    amountReceived: number;
    changeDue: number;
    status: "completed" | "cancelled";
    createdBy: Types.ObjectId;
    createdAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
    {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },
        serialNumbers: { type: [String], default: [] },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        lineTotal: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const saleSchema = new Schema<ISale>(
    {
        invoiceNumber: { type: String, required: true, unique: true },
        items: { type: [saleItemSchema], required: true },
        customerName: { type: String, trim: true },
        customerPhone: { type: String, trim: true },
        subtotal: { type: Number, required: true },
        discount: { type: Number, required: true, default: 0 },
        taxPercent: { type: Number, required: true, default: 0 },
        taxAmount: { type: Number, required: true, default: 0 },
        total: { type: Number, required: true },
        paymentMethod: {
            type: String,
            enum: ["Cash", "UPI", "Card"],
            required: true,
        },
        amountReceived: { type: Number, required: true, default: 0 },
        changeDue: { type: Number, required: true, default: 0 },
        status: {
            type: String,
            enum: ["completed", "cancelled"],
            default: "completed",
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

export default model<ISale>("Sale", saleSchema);

// Simple counter used to generate sequential invoice numbers.
interface ICounter extends Document {
    name: string;
    seq: number;
}

const counterSchema = new Schema<ICounter>({
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
});

export const Counter = model<ICounter>("Counter", counterSchema);

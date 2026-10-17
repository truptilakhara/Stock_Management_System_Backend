import { Document, Schema, model } from "mongoose";
export interface ISupplier extends Document {
    name: string;
    phone: string;
    email: string;
    address: string;
    companyName: string;
}

const supplierSchema = new Schema<ISupplier>({
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true },
    address: { type: String, required: true },
    companyName: { type: String, required: true },
}, {
    timestamps: true
})

export default model<ISupplier>("Supplier", supplierSchema)
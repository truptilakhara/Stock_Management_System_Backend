import { Types } from "mongoose";
import Product from "../models/products";
import Sale from "../models/sales";

type Failure = { ok: false; status: number; message: string };
type Deducted = {
    ok: true;
    productName: string;
    sellingPrice: number;
    /** Serials that were in the product's stock list and have now been removed from it. */
    known: string[];
};

// Takes `quantity` units out of stock. If serial numbers are given, those units are
// removed from the product's serial list too. Safe against two sales at the same time.
export async function deductStock(
    productId: string | Types.ObjectId,
    quantity: number,
    serials: string[]
): Promise<Deducted | Failure> {
    const product = await Product.findById(productId);

    if (!product) {
        return { ok: false, status: 404, message: "Product not found." };
    }
    if (product.quantity < quantity) {
        return {
            ok: false,
            status: 400,
            message: `Only ${product.quantity} in stock for ${product.productName}.`,
        };
    }
    if (serials.length > 0 && serials.length !== quantity) {
        return {
            ok: false,
            status: 400,
            message: `${product.productName}: enter ${quantity} serial number${quantity === 1 ? "" : "s"} (you entered ${serials.length}).`,
        };
    }

    const inStock = new Set(product.serialNumbers ?? []);
    const known = serials.filter((s) => inStock.has(s));
    const manual = serials.filter((s) => !inStock.has(s));

    // A serial typed by hand must not belong to a different product or an earlier sale.
    if (manual.length > 0) {
        const other = await Product.findOne({
            _id: { $ne: product._id },
            serialNumbers: { $in: manual },
        }).select("productName serialNumbers");

        if (other) {
            const clash = manual.find((s) => other.serialNumbers.includes(s));
            return {
                ok: false,
                status: 400,
                message: `Serial number ${clash} belongs to ${other.productName}, not ${product.productName}.`,
            };
        }

        const sold = await Sale.findOne({
            status: "completed",
            "items.serialNumbers": { $in: manual },
        }).select("invoiceNumber items.serialNumbers");

        if (sold) {
            const clash = manual.find((s) =>
                sold.items.some((i) => i.serialNumbers?.includes(s))
            );
            return {
                ok: false,
                status: 400,
                message: `Serial number ${clash} was already sold on ${sold.invoiceNumber}.`,
            };
        }
    }

    const filter: Record<string, unknown> = {
        _id: product._id,
        quantity: { $gte: quantity },
    };
    if (known.length > 0) filter.serialNumbers = { $all: known };

    const update: Record<string, unknown> = { $inc: { quantity: -quantity } };
    if (known.length > 0) update.$pull = { serialNumbers: { $in: known } };

    const updated = await Product.findOneAndUpdate(filter, update, { new: true });

    if (!updated) {
        return {
            ok: false,
            status: 409,
            message: `Stock for ${product.productName} just changed. Please try again.`,
        };
    }

    return {
        ok: true,
        productName: product.productName,
        sellingPrice: product.sellingPrice,
        known,
    };
}

// Puts units back into stock (used when a sale fails part-way or is cancelled).
export async function restoreStock(
    productId: string | Types.ObjectId,
    quantity: number,
    serials: string[]
) {
    const update: Record<string, unknown> = { $inc: { quantity } };
    if (serials.length > 0) update.$addToSet = { serialNumbers: { $each: serials } };
    await Product.updateOne({ _id: productId }, update);
}

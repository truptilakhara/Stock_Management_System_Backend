import { Request, Response } from "express";
import Product from "../models/products";
import Transaction from "../models/transactions";
import Sale, { Counter, ISaleItem } from "../models/sales";
import { deductStock, restoreStock } from "../utils/stock";
import { normalizeSerials } from "../utils/serials";

const PAYMENT_METHODS = ["Cash", "UPI", "Card"];
const round2 = (n: number) => Math.round(n * 100) / 100;

async function nextInvoiceNumber() {
    const counter = await Counter.findOneAndUpdate(
        { name: "invoice" },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
    );
    return `INV-${String(counter.seq).padStart(4, "0")}`;
}

export const createSale = async (req: Request, res: Response) => {
    // Items whose stock was already deducted, so we can undo if something fails.
    const deducted: { product: string; quantity: number; serials: string[] }[] = [];

    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated." });
        }

        const {
            items,
            customerName,
            customerPhone,
            discount = 0,
            taxPercent = 0,
            paymentMethod,
            amountReceived = 0,
        } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Add at least one item to the bill." });
        }
        if (!PAYMENT_METHODS.includes(paymentMethod)) {
            return res.status(400).json({ message: "Select a valid payment method." });
        }

        const discountValue = Number(discount);
        const taxPercentValue = Number(taxPercent);
        const receivedValue = Number(amountReceived);

        if (!Number.isFinite(discountValue) || discountValue < 0) {
            return res.status(400).json({ message: "Discount must be 0 or more." });
        }
        if (!Number.isFinite(taxPercentValue) || taxPercentValue < 0 || taxPercentValue > 100) {
            return res.status(400).json({ message: "Tax must be between 0 and 100%." });
        }
        if (!Number.isFinite(receivedValue) || receivedValue < 0) {
            return res.status(400).json({ message: "Amount received is invalid." });
        }

        // Merge duplicate products, validate quantities and collect serial numbers.
        const merged = new Map<string, { qty: number; serials: string[] }>();
        for (const item of items) {
            const qty = Number(item?.quantity);
            if (!item?.product || !Number.isInteger(qty) || qty < 1) {
                return res.status(400).json({ message: "Each item needs a product and a whole quantity of at least 1." });
            }
            const { serials, error } = normalizeSerials(item.serialNumbers);
            if (error) return res.status(400).json({ message: error });
            const entry = merged.get(String(item.product)) ?? { qty: 0, serials: [] };
            entry.qty += qty;
            entry.serials.push(...serials);
            merged.set(String(item.product), entry);
        }

        // The same serial number cannot be on two lines of one bill.
        const allSerials = [...merged.values()].flatMap((e) => e.serials);
        if (new Set(allSerials).size !== allSerials.length) {
            return res.status(400).json({ message: "A serial number is used more than once on this bill." });
        }

        // Load products and use the price stored on the server, never the client.
        const saleItems: ISaleItem[] = [];
        for (const [productId, { qty, serials }] of merged) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: "A product on this bill no longer exists." });
            }
            if (product.quantity < qty) {
                return res.status(400).json({
                    message: `Only ${product.quantity} in stock for ${product.productName}.`,
                });
            }
            saleItems.push({
                product: product._id,
                productName: product.productName,
                serialNumbers: serials,
                quantity: qty,
                price: product.sellingPrice,
                lineTotal: round2(product.sellingPrice * qty),
            } as ISaleItem);
        }

        const subtotal = round2(saleItems.reduce((sum, i) => sum + i.lineTotal, 0));
        if (discountValue > subtotal) {
            return res.status(400).json({ message: "Discount cannot be more than the subtotal." });
        }
        const taxable = subtotal - discountValue;
        const taxAmount = round2((taxable * taxPercentValue) / 100);
        const total = round2(taxable + taxAmount);

        if (paymentMethod === "Cash" && receivedValue < total) {
            return res.status(400).json({ message: "Amount received is less than the total." });
        }
        const received = paymentMethod === "Cash" ? receivedValue : total;
        const changeDue = round2(Math.max(0, received - total));

        // Deduct stock with a conditional update so two sales can't oversell.
        for (const item of saleItems) {
            const result = await deductStock(item.product, item.quantity, item.serialNumbers);
            if (!result.ok) {
                // Roll back the lines already taken, then report the real reason.
                for (const d of deducted) await restoreStock(d.product, d.quantity, d.serials);
                deducted.length = 0;
                return res.status(result.status).json({ message: result.message });
            }
            deducted.push({ product: String(item.product), quantity: item.quantity, serials: result.known });
        }

        const invoiceNumber = await nextInvoiceNumber();

        const sale = await Sale.create({
            invoiceNumber,
            items: saleItems,
            customerName: customerName?.trim() || undefined,
            customerPhone: customerPhone?.trim() || undefined,
            subtotal,
            discount: discountValue,
            taxPercent: taxPercentValue,
            taxAmount,
            total,
            paymentMethod,
            amountReceived: received,
            changeDue,
            createdBy: userId,
        });

        // Keep the stock-out ledger in sync so reports and history stay correct.
        await Transaction.insertMany(
            saleItems.map((item) => ({
                product: item.product,
                type: "stock-out",
                quantity: item.quantity,
                reason: "Sold",
                reference: invoiceNumber,
                serialNumbers: item.serialNumbers,
                createdBy: userId,
            }))
        );

        return res.status(201).json({ message: "Sale recorded successfully.", data: sale });
    } catch (error) {
        // Put back any stock we already took.
        for (const d of deducted) {
            await restoreStock(d.product, d.quantity, d.serials);
        }
        console.error("Failed to create sale:", error);
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Failed to record sale.",
        });
    }
};

export const getSales = async (req: Request, res: Response) => {
    try {
        const sales = await Sale.find().sort({ createdAt: -1 }).limit(200);

        // India-local day / month boundaries, converted to UTC.
        const offset = 330 * 60 * 1000;
        const nowIndia = new Date(Date.now() + offset);
        const startOfDay = new Date(
            Date.UTC(nowIndia.getUTCFullYear(), nowIndia.getUTCMonth(), nowIndia.getUTCDate()) - offset
        );
        const startOfMonth = new Date(
            Date.UTC(nowIndia.getUTCFullYear(), nowIndia.getUTCMonth(), 1) - offset
        );

        const sumFor = async (from?: Date) => {
            const match: Record<string, unknown> = { status: "completed" };
            if (from) match.createdAt = { $gte: from };
            const r = await Sale.aggregate([
                { $match: match },
                { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
            ]);
            return { total: r[0]?.total ?? 0, count: r[0]?.count ?? 0 };
        };

        const [today, month, all] = await Promise.all([
            sumFor(startOfDay),
            sumFor(startOfMonth),
            sumFor(),
        ]);

        return res.status(200).json({
            message: "Sales fetched successfully.",
            data: sales,
            summary: {
                todaySales: today.total,
                todayBills: today.count,
                monthSales: month.total,
                totalBills: all.count,
                averageBill: all.count ? round2(all.total / all.count) : 0,
            },
        });
    } catch (error) {
        console.error("Failed to fetch sales:", error);
        return res.status(500).json({ message: "Failed to fetch sales." });
    }
};

export const cancelSale = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const sale = await Sale.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({ message: "Sale not found." });
        }
        if (sale.status === "cancelled") {
            return res.status(400).json({ message: "This sale is already cancelled." });
        }

        // Claim the cancellation first so it can't run twice.
        const claimed = await Sale.findOneAndUpdate(
            { _id: sale._id, status: "completed" },
            { status: "cancelled" },
            { new: true }
        );
        if (!claimed) {
            return res.status(400).json({ message: "This sale is already cancelled." });
        }

        for (const item of sale.items) {
            await restoreStock(item.product, item.quantity, item.serialNumbers ?? []);
        }

        await Transaction.insertMany(
            sale.items.map((item) => ({
                product: item.product,
                type: "stock-in",
                quantity: item.quantity,
                reason: "Sale cancelled",
                reference: sale.invoiceNumber,
                serialNumbers: item.serialNumbers ?? [],
                createdBy: userId,
            }))
        );

        return res.status(200).json({ message: "Sale cancelled and stock restored.", data: claimed });
    } catch (error) {
        console.error("Failed to cancel sale:", error);
        return res.status(500).json({ message: "Failed to cancel sale." });
    }
};

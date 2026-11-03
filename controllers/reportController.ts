import { Request, Response } from "express";
import Transaction from "../models/transactions";

export const getStockInReport = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find({
            type: "stock-in"
        })
            .populate("product")
            .populate("createdBy", "-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Stock-in report fetched successfully.",
            data: transactions
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

export const getStockOutReport = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find({
            type: "stock-out"
        })
            .populate("product")
            .populate("createdBy", "-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Stock-out report fetched successfully.",
            data: transactions
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

export const getTransactionReport = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find()
            .populate("product")
            .populate("createdBy", "-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Transaction report fetched successfully.",
            data: transactions
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error."
        });
    }
};

// ---------- Business summary (sales, profit, inventory) ----------
import Sale from "../models/sales";
import Product from "../models/products";

const OFFSET_MS = 330 * 60 * 1000; // India (UTC+05:30)
const round2 = (n: number) => Math.round(n * 100) / 100;

// "2026-10-31" -> UTC Date for the start of that day in India time.
const parseIndiaDay = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d) - OFFSET_MS);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatIndiaDay = (date: Date) =>
    new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);

export const getReportSummary = async (req: Request, res: Response) => {
    try {
        const DAY = 24 * 60 * 60 * 1000;
        const todayStart = parseIndiaDay(formatIndiaDay(new Date()))!;

        let start = parseIndiaDay(req.query.from as string) ?? new Date(todayStart.getTime() - 29 * DAY);
        const toDay = parseIndiaDay(req.query.to as string) ?? todayStart;
        const end = new Date(toDay.getTime() + DAY); // exclusive

        if (start >= end) {
            return res.status(400).json({ message: "'From' date must be before 'To' date." });
        }
        if (end.getTime() - start.getTime() > 366 * DAY) {
            return res.status(400).json({ message: "Choose a range of one year or less." });
        }

        const saleMatch = { status: "completed", createdAt: { $gte: start, $lt: end } };

        const [totalsAgg, dailyAgg, paymentAgg, productAgg, movementAgg, cancelledCount, products] =
            await Promise.all([
                Sale.aggregate([
                    { $match: saleMatch },
                    {
                        $group: {
                            _id: null,
                            revenue: { $sum: "$total" },
                            bills: { $sum: 1 },
                            discount: { $sum: "$discount" },
                            tax: { $sum: "$taxAmount" },
                        },
                    },
                ]),
                Sale.aggregate([
                    { $match: saleMatch },
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" },
                            },
                            total: { $sum: "$total" },
                            bills: { $sum: 1 },
                        },
                    },
                ]),
                Sale.aggregate([
                    { $match: saleMatch },
                    { $group: { _id: "$paymentMethod", total: { $sum: "$total" }, bills: { $sum: 1 } } },
                    { $sort: { total: -1 } },
                ]),
                Sale.aggregate([
                    { $match: saleMatch },
                    { $unwind: "$items" },
                    {
                        $group: {
                            _id: "$items.product",
                            productName: { $first: "$items.productName" },
                            quantity: { $sum: "$items.quantity" },
                            revenue: { $sum: "$items.lineTotal" },
                        },
                    },
                    {
                        $lookup: {
                            from: "products",
                            localField: "_id",
                            foreignField: "_id",
                            as: "p",
                        },
                    },
                    {
                        $addFields: {
                            // Cost uses the product's current purchase price.
                            cost: {
                                $multiply: ["$quantity", { $ifNull: [{ $first: "$p.purchasePrice" }, 0] }],
                            },
                        },
                    },
                    { $project: { p: 0 } },
                    { $sort: { revenue: -1 } },
                ]),
                Transaction.aggregate([
                    { $match: { createdAt: { $gte: start, $lt: end } } },
                    { $group: { _id: "$type", quantity: { $sum: "$quantity" }, entries: { $sum: 1 } } },
                ]),
                Sale.countDocuments({ status: "cancelled", createdAt: { $gte: start, $lt: end } }),
                Product.find().select("productName quantity minimumStock purchasePrice sellingPrice").lean(),
            ]);

        // Sales by day, with empty days filled in as 0.
        const dailyMap = new Map<string, { total: number; bills: number }>(
            dailyAgg.map((d) => [d._id as string, { total: d.total, bills: d.bills }])
        );
        const daily: { date: string; total: number; bills: number }[] = [];
        for (let t = start.getTime(); t < end.getTime(); t += DAY) {
            const key = formatIndiaDay(new Date(t));
            const v = dailyMap.get(key);
            daily.push({ date: key, total: round2(v?.total ?? 0), bills: v?.bills ?? 0 });
        }

        const revenue = totalsAgg[0]?.revenue ?? 0;
        const bills = totalsAgg[0]?.bills ?? 0;
        const cost = productAgg.reduce((sum, p) => sum + p.cost, 0);
        const itemsSold = productAgg.reduce((sum, p) => sum + p.quantity, 0);
        // Profit is on pre-tax sales: revenue minus tax minus cost of goods.
        const profit = round2(revenue - (totalsAgg[0]?.tax ?? 0) - cost);

        const movement = (type: string) => movementAgg.find((m) => m._id === type);

        const lowStock = products
            .filter((p) => p.quantity <= p.minimumStock)
            .sort((a, b) => a.quantity - b.quantity)
            .map((p) => ({
                _id: p._id,
                productName: p.productName,
                quantity: p.quantity,
                minimumStock: p.minimumStock,
            }));

        return res.status(200).json({
            message: "Report summary fetched successfully.",
            data: {
                range: { from: formatIndiaDay(start), to: formatIndiaDay(toDay) },
                sales: {
                    revenue: round2(revenue),
                    bills,
                    averageBill: bills ? round2(revenue / bills) : 0,
                    discount: round2(totalsAgg[0]?.discount ?? 0),
                    tax: round2(totalsAgg[0]?.tax ?? 0),
                    itemsSold,
                    cost: round2(cost),
                    profit,
                    cancelledBills: cancelledCount,
                },
                daily,
                payments: paymentAgg.map((p) => ({ method: p._id, total: round2(p.total), bills: p.bills })),
                topProducts: productAgg.slice(0, 10).map((p) => ({
                    productName: p.productName,
                    quantity: p.quantity,
                    revenue: round2(p.revenue),
                    profit: round2(p.revenue - p.cost),
                })),
                movement: {
                    stockInQuantity: movement("stock-in")?.quantity ?? 0,
                    stockOutQuantity: movement("stock-out")?.quantity ?? 0,
                },
                inventory: {
                    totalProducts: products.length,
                    totalUnits: products.reduce((s, p) => s + p.quantity, 0),
                    stockValueAtCost: round2(products.reduce((s, p) => s + p.quantity * p.purchasePrice, 0)),
                    stockValueAtRetail: round2(products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0)),
                    outOfStock: products.filter((p) => p.quantity === 0).length,
                    lowStock,
                },
            },
        });
    } catch (error) {
        console.error("Failed to build report summary:", error);
        return res.status(500).json({ message: "Failed to build report summary." });
    }
};


// ---------- Sales trend by month or year ----------
export const getSalesTrend = async (req: Request, res: Response) => {
    try {
        const by = req.query.by === "year" ? "year" : "month";
        const nowIndia = new Date(Date.now() + OFFSET_MS);
        const thisYear = nowIndia.getUTCFullYear();
        const thisMonth = nowIndia.getUTCMonth(); // 0-based

        const rows = await Sale.aggregate([
            { $match: { status: "completed" } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: by === "year" ? "%Y" : "%Y-%m",
                            date: "$createdAt",
                            timezone: "Asia/Kolkata",
                        },
                    },
                    total: { $sum: "$total" },
                    bills: { $sum: 1 },
                },
            },
        ]);
        const map = new Map<string, { total: number; bills: number }>(
            rows.map((r) => [r._id as string, { total: r.total, bills: r.bills }])
        );

        const points: { key: string; total: number; bills: number }[] = [];

        if (by === "month") {
            // Last 12 months including the current one.
            for (let i = 11; i >= 0; i--) {
                const d = new Date(Date.UTC(thisYear, thisMonth - i, 1));
                const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                const v = map.get(key);
                points.push({ key, total: round2(v?.total ?? 0), bills: v?.bills ?? 0 });
            }
        } else {
            // From the first year with a sale up to this year (at least 5 years shown).
            const years = rows.map((r) => Number(r._id));
            const first = Math.min(thisYear - 4, ...(years.length ? years : [thisYear]));
            for (let y = first; y <= thisYear; y++) {
                const v = map.get(String(y));
                points.push({ key: String(y), total: round2(v?.total ?? 0), bills: v?.bills ?? 0 });
            }
        }

        return res.status(200).json({ message: "Sales trend fetched successfully.", data: points });
    } catch (error) {
        console.error("Failed to build sales trend:", error);
        return res.status(500).json({ message: "Failed to build sales trend." });
    }
};

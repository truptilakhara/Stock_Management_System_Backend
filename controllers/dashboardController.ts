import { Request, Response } from "express";
import Product from "../models/products";
import Transaction from "../models/transactions";
import User from "../models/user";

export const getDashboard = async (req: Request, res: Response) => {
    try {
        const { role } = (req as any).user
        // Total products
        const totalProducts = await Product.countDocuments();

        // Total stock quantity
        const stockData = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: "$quantity" }
                }
            }
        ]);

        const totalStock = stockData[0]?.totalQuantity || 0;

        // Low stock products
        const lowStockProducts = await Product.find({
            $expr: {
                $lte: ["$quantity", "$minimumStock"]
            }
        })
            .populate("category")
            .populate("supplier");


        // Recent transactions
        const recentTransactions = await Transaction.find()
            .populate("product")
            .populate("createdBy", "-password")
            .sort({ createdAt: -1 })
            .limit(5);
        //Total quanitty of stock in transactions
        const totalQuantityStockIn = await Transaction.aggregate([
            {
                $match: {
                    type: "stock-in",
                },
            },
            {
                $group: {
                    _id: null,
                    totalQuantity: {
                        $sum: "$quantity",
                    },
                },
            },
        ])
        const totalStockIn = totalQuantityStockIn[0]?.totalQuantity || 0;
        const totalQuantityStockOut = await Transaction.aggregate([
            {
                $match: {
                    type: "stock-out",
                },
            },
            {
                $group: {
                    _id: null,
                    totalQuantity: {
                        $sum: "$quantity",
                    },
                },
            },
        ])
        const totalStockOut = totalQuantityStockOut[0]?.totalQuantity || 0;
        const data: any = {
            totalProducts,
            totalStock,
            lowStockProducts,
            totalStockIn,
            totalStockOut,
            recentTransactions,
            role
        };

        if (role === "owner") {
            data.totalUsers = await User.countDocuments();
        }
        return res.status(200).json({
            message: "Dashboard data fetched successfully.",
            data
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoute from "./routes/authRoute";
import productRoute from "./routes/productRoute";
import categoryRoute from "./routes/categoryRoute";
import supplierRoute from "./routes/supllierRoute";
import userRoute from "./routes/userRoute";
import transactionRoute from "./routes/transactionRoute"
import stockInRoute from "./routes/stockInRoute";
import stockOutRoute from "./routes/stockOutRoute";
import reportRoute from "./routes/reportRoute";
import dashboardRoute from "./routes/dashboardRoute";
import salesRoute from "./routes/salesRoute";
import cors from "cors";
dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in .env");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

app.use("/api/auth", authRoute);
app.use("/api/products", productRoute);
app.use("/api/category", categoryRoute);
app.use("/api/supplier", supplierRoute);
app.use("/api/users", userRoute);
app.use("/api/transactions", transactionRoute);
app.use("/api/stock-in", stockInRoute);
app.use("/api/stock-out", stockOutRoute);
app.use("/api/reports", reportRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/sales", salesRoute);
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("DB CONNECTED");
    await migrateSkuToSerials();

    app.listen(PORT, () => {
      console.log(`LISTENING ON PORT NUMBER ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Database connection failed:", err.message);
  });

// One-time conversion: the old unique `sku` field becomes the product's serial number list.
async function migrateSkuToSerials() {
  try {
    const products = mongoose.connection.collection("products");
    try {
      await products.dropIndex("sku_1");
    } catch {
      // index already gone
    }
    const result = await products.updateMany(
      { sku: { $exists: true } },
      [
        {
          $set: {
            serialNumbers: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ["$serialNumbers", []] } }, 0] },
                "$serialNumbers",
                { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$sku", ""] } }, 0] }, [{ $toUpper: "$sku" }], []] },
              ],
            },
          },
        },
        { $unset: "sku" },
      ]
    );
    if (result.modifiedCount) console.log(`Converted ${result.modifiedCount} product SKU(s) to serial numbers`);
  } catch (err) {
    console.log("Serial number migration skipped:", (err as Error).message);
  }
}

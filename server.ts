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
import cors from "cors";
dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in .env");
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
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("DB CONNECTED");

    app.listen(PORT, () => {
      console.log(`LISTENING ON PORT NUMBER ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Database connection failed:", err.message);
  });
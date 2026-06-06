import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import { securityHeaders } from "./middleware/security.middleware.js";

const app = express();
const __dirname = path.resolve();

app.use(securityHeaders);
app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: env.NODE_ENV,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);

if (env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "frontend", "dist")));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

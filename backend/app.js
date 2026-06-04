import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
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

app.use(securityHeaders); //applies the protected to every backend response
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

app.use(notFoundHandler); //middleware executes inorder, so when it finds the route which does not match any of the above, this runs
app.use(errorHandler); //this is special middleware which has four parameters so the error gets passed to this

export default app;

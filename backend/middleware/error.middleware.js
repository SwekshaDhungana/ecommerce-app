import { env } from "../config/env.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;

  console.error("Unhandled error:", err);

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

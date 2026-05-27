import mongoose from "mongoose";
import { env } from "../config/env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`MongoDB connected at ${conn.connection.host}`);
  } catch (error) {
    console.error("Error connecting MongoDB", error.message);
    process.exit(1);
  }
};

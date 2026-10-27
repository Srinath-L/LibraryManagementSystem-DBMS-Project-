import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDatabase() {
  await mongoose.connect(config.mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000
  });
  console.log("MongoDB connected");
}

export async function closeDatabase() {
  await mongoose.disconnect();
}

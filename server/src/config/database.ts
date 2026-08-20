import mongoose from "mongoose";
import type { Env } from "./env.js";

export async function connectDatabase(env: Env): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.DATABASE_URL, {
    autoIndex: env.NODE_ENV !== "production",
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

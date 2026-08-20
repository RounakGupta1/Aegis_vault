import type { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
      sessionId?: string;
    }
  }
}

export {};

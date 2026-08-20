import type { NextFunction, Request, Response } from "express";
import type { Env } from "../config/env.js";
import { ACCESS_COOKIE } from "../config/constants.js";
import { verifyAccessToken } from "../security/tokens.js";
import { SessionModel } from "../models/Session.js";
import { UnauthorizedError } from "../utils/appError.js";
import mongoose from "mongoose";

export function authMiddleware(env: Env) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
      if (!token) {
        throw new UnauthorizedError("Authentication required");
      }
      const payload = verifyAccessToken(env, token);
      const session = await SessionModel.findById(payload.sid);
      if (!session || session.revokedAt || String(session.userId) !== payload.sub) {
        throw new UnauthorizedError("Session is no longer valid");
      }
      req.userId = new mongoose.Types.ObjectId(payload.sub);
      req.sessionId = payload.sid;
      next();
    } catch (error) {
      next(error instanceof UnauthorizedError ? error : new UnauthorizedError("Invalid token"));
    }
  };
}

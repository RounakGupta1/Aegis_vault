import type { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE } from "../config/constants.js";
import { SessionModel } from "../models/Session.js";
import { sha256 } from "../security/crypto.js";
import { ForbiddenError } from "../utils/appError.js";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export async function csrfMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) {
    next();
    return;
  }
  try {
    const header = req.get("x-csrf-token");
    const cookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
    if (!header || !cookie || header !== cookie || !req.sessionId) {
      throw new ForbiddenError("CSRF validation failed");
    }
    const session = await SessionModel.findById(req.sessionId);
    if (!session || session.csrfTokenHash !== sha256(cookie)) {
      throw new ForbiddenError("CSRF validation failed");
    }
    next();
  } catch (error) {
    next(error);
  }
}

import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";
import { fail } from "../utils/apiResponse.js";
import type { Env } from "../config/env.js";

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError("Route not found", 404));
}

export function errorHandler(env: Env) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as { statusCode?: number; message?: string; name?: string };
    let status = error.statusCode ?? 500;
    let message = error.message ?? "Internal server error";

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      status = 401;
      message = "Invalid token";
    }

    if (error.name === "CastError") {
      status = 400;
      message = "Invalid identifier";
    }

    if (status >= 500) {
      if (env.NODE_ENV !== "test") {
        console.error("[error]", error.name ?? "Error");
      }
      if (env.NODE_ENV === "production") {
        message = "Internal server error";
      }
    }

    res.status(status).json(fail(message));
  };
}

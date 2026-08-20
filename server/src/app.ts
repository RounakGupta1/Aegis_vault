import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Env } from "./config/env.js";
import { mongoSanitize } from "./middlewares/sanitize.js";
import { errorHandler, notFound } from "./middlewares/error.js";
import { authRouter } from "./routes/auth.routes.js";
import { vaultRouter } from "./routes/vault.routes.js";
import { securityRouter } from "./routes/security.routes.js";

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");

export function createApp(env: Env) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'", env.CLIENT_URL, env.SERVER_URL],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    }),
  );
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());
  app.use(hpp());
  app.use(mongoSanitize);

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests" },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === "test" ? 1000 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many authentication attempts" },
  });

  app.use(globalLimiter);
  app.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "Aegis API is healthy", data: { status: "ok" } });
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
  app.use("/api/auth/prelogin", authLimiter);
  app.use("/api/auth", authRouter(env));
  app.use("/api/vault", vaultRouter(env));
  app.use("/api/security", securityRouter(env));

  const spaIndex = path.join(clientDist, "index.html");
  if (fs.existsSync(spaIndex)) {
    app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(spaIndex);
    });
  }

  app.use(notFound);
  app.use(errorHandler(env));
  return app;
}

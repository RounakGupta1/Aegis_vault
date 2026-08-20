import { Router } from "express";
import type { Env } from "../config/env.js";
import { securityController } from "../controllers/security.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { csrfMiddleware } from "../middlewares/csrf.js";
import { validateBody } from "../middlewares/validate.js";
import { passwordCheckSchema } from "../validators/auth.js";

export function securityRouter(env: Env) {
  const router = Router();
  router.use(authMiddleware(env));
  router.get("/health", securityController.health);
  router.post(
    "/password-check",
    csrfMiddleware,
    validateBody(passwordCheckSchema),
    securityController.passwordCheck,
  );
  return router;
}

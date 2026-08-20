import { Router } from "express";
import type { Env } from "../config/env.js";
import { authController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { csrfMiddleware } from "../middlewares/csrf.js";
import { validateBody } from "../middlewares/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  preloginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from "../validators/auth.js";

export function authRouter(env: Env) {
  const router = Router();
  const controller = authController(env);

  router.post("/prelogin", validateBody(preloginSchema), controller.prelogin);
  router.post("/register", validateBody(registerSchema), controller.register);
  router.post("/login", validateBody(loginSchema), controller.login);
  router.post("/verify-email", validateBody(verifyEmailSchema), controller.verifyEmail);
  router.post("/forgot-password", validateBody(forgotPasswordSchema), controller.forgotPassword);
  router.post("/reset-material", validateBody(verifyEmailSchema), controller.resetMaterial);
  router.post("/reset-password", validateBody(resetPasswordSchema), controller.resetPassword);
  router.post("/refresh", controller.refresh);
  router.post("/logout", authMiddleware(env), csrfMiddleware, controller.logout);
  router.get("/me", authMiddleware(env), controller.me);
  router.patch(
    "/me",
    authMiddleware(env),
    csrfMiddleware,
    validateBody(updateProfileSchema),
    controller.updateProfile,
  );

  return router;
}

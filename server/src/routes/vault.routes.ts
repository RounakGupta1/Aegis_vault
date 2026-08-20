import { Router } from "express";
import type { Env } from "../config/env.js";
import { vaultController } from "../controllers/vault.controller.js";
import { authMiddleware } from "../middlewares/auth.js";
import { csrfMiddleware } from "../middlewares/csrf.js";
import { validateBody } from "../middlewares/validate.js";
import { vaultItemSchema } from "../validators/auth.js";

export function vaultRouter(env: Env) {
  const router = Router();
  router.use(authMiddleware(env));
  router.get("/", vaultController.list);
  router.post("/", csrfMiddleware, validateBody(vaultItemSchema), vaultController.create);
  router.put("/:id", csrfMiddleware, validateBody(vaultItemSchema), vaultController.update);
  router.delete("/:id", csrfMiddleware, vaultController.remove);
  return router;
}

import type { Request, Response, NextFunction } from "express";
import type { Env } from "../config/env.js";
import * as authService from "../services/auth.service.js";
import { ok } from "../utils/apiResponse.js";

export function authController(env: Env) {
  return {
    prelogin: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const data = await authService.prelogin(env, req.body.email);
        res.json(ok("KDF parameters loaded", data));
      } catch (error) {
        next(error);
      }
    },
    register: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await authService.register(env, req.body);
        res.status(201).json(ok("Account created. Check your email to verify.", { user }));
      } catch (error) {
        next(error);
      }
    },
    login: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await authService.login(env, req, res, req.body);
        res.json(ok("Signed in successfully", { user }));
      } catch (error) {
        next(error);
      }
    },
    logout: async (req: Request, res: Response, next: NextFunction) => {
      try {
        await authService.logout(env, req, res);
        res.json(ok("Signed out", {}));
      } catch (error) {
        next(error);
      }
    },
    refresh: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await authService.refresh(env, req, res);
        res.json(ok("Session refreshed", { user }));
      } catch (error) {
        next(error);
      }
    },
    me: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await authService.me(String(req.userId));
        res.json(ok("Profile loaded", { user }));
      } catch (error) {
        next(error);
      }
    },
    verifyEmail: async (req: Request, res: Response, next: NextFunction) => {
      try {
        await authService.verifyEmail(req.body.token);
        res.json(ok("Email verified", {}));
      } catch (error) {
        next(error);
      }
    },
    forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
      try {
        await authService.forgotPassword(env, req.body.email);
        res.json(ok("If that account exists, reset instructions were sent.", {}));
      } catch (error) {
        next(error);
      }
    },
    resetMaterial: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const data = await authService.resetMaterial(req.body.token);
        res.json(ok("Recovery wrap loaded", data));
      } catch (error) {
        next(error);
      }
    },
    resetPassword: async (req: Request, res: Response, next: NextFunction) => {
      try {
        await authService.resetPassword(env, req.body);
        res.json(ok("Master password updated. Sign in again.", {}));
      } catch (error) {
        next(error);
      }
    },
    updateProfile: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await authService.updateProfile(String(req.userId), req.body);
        res.json(ok("Profile updated", { user }));
      } catch (error) {
        next(error);
      }
    },
  };
}

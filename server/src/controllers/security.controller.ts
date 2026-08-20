import type { Request, Response, NextFunction } from "express";
import { ok } from "../utils/apiResponse.js";

export const securityController = {
  health: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(
        ok("Security health is computed on the client after vault decrypt", {
          computedClientSide: true,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
  passwordCheck: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prefix = req.body.prefix as string;
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { "Add-Padding": "true" },
      });
      if (!response.ok) {
        res.json(ok("Breach dataset unavailable", { available: false, suffixes: "" }));
        return;
      }
      const suffixes = await response.text();
      res.json(ok("Range retrieved", { available: true, suffixes }));
    } catch (error) {
      next(error);
    }
  },
};

import type { Request, Response, NextFunction } from "express";
import * as vaultService from "../services/vault.service.js";
import { ok } from "../utils/apiResponse.js";

export const vaultController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await vaultService.listVaultItems(String(req.userId));
      res.json(ok("Vault loaded", { items }));
    } catch (error) {
      next(error);
    }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await vaultService.createVaultItem(String(req.userId), req.body);
      res.status(201).json(ok("Vault item saved", { item }));
    } catch (error) {
      next(error);
    }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await vaultService.updateVaultItem(String(req.userId), req.params.id, req.body);
      res.json(ok("Vault item updated", { item }));
    } catch (error) {
      next(error);
    }
  },
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await vaultService.deleteVaultItem(String(req.userId), req.params.id);
      res.json(ok("Vault item deleted", {}));
    } catch (error) {
      next(error);
    }
  },
};

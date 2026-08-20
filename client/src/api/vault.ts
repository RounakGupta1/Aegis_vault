import { api } from "./client";
import type { EncryptedVaultItem } from "../types/vault";

export const vaultApi = {
  list: () => api<{ items: EncryptedVaultItem[] }>("/api/vault"),
  create: (payload: { ciphertext: string; iv: string; version: number }) =>
    api<{ item: EncryptedVaultItem }>("/api/vault", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: { ciphertext: string; iv: string; version: number }) =>
    api<{ item: EncryptedVaultItem }>(`/api/vault/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) => api<Record<string, never>>(`/api/vault/${id}`, { method: "DELETE" }),
};

export const securityApi = {
  passwordCheck: (prefix: string) =>
    api<{ available: boolean; suffixes: string }>("/api/security/password-check", {
      method: "POST",
      body: JSON.stringify({ prefix }),
    }),
};

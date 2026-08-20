import { api } from "./client";
import type { PublicUser } from "../types/vault";
import type { KdfParams } from "../lib/crypto";

export const authApi = {
  prelogin: (email: string) =>
    api<{ kdfSalt: string; kdfParams: KdfParams }>("/api/auth/prelogin", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  register: (payload: unknown) =>
    api<{ user: PublicUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: unknown) =>
    api<{ user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () => api<Record<string, never>>("/api/auth/logout", { method: "POST" }),
  refresh: () => api<{ user: PublicUser }>("/api/auth/refresh", { method: "POST" }),
  me: () => api<{ user: PublicUser }>("/api/auth/me"),
  verifyEmail: (token: string) =>
    api<Record<string, never>>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  forgotPassword: (email: string) =>
    api<Record<string, never>>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload: unknown) =>
    api<Record<string, never>>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProfile: (payload: unknown) =>
    api<{ user: PublicUser }>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};

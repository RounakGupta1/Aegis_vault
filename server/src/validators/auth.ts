import { z } from "zod";

const kdfParams = z.object({
  type: z.literal("argon2id"),
  memory: z.number().int().min(8192).max(1048576),
  iterations: z.number().int().min(1).max(10),
  parallelism: z.number().int().min(1).max(4),
  hashLength: z.literal(32),
});

const base64 = z.string().min(8).max(4096);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  authVerifier: z.string().regex(/^[a-f0-9]{64}$/),
  kdfSalt: base64,
  kdfParams,
  wrappedVaultKey: base64,
  wrappedVaultKeyIv: base64,
  recoveryWrappedVaultKey: base64.optional(),
  recoveryWrappedVaultKeyIv: base64.optional(),
});

export const preloginSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  authVerifier: z.string().regex(/^[a-f0-9]{64}$/),
  rememberDevice: z.boolean().optional().default(false),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(16).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16).max(200),
  authVerifier: z.string().regex(/^[a-f0-9]{64}$/),
  kdfSalt: base64,
  kdfParams,
  wrappedVaultKey: base64,
  wrappedVaultKeyIv: base64,
  recoveryWrappedVaultKey: base64.optional(),
  recoveryWrappedVaultKeyIv: base64.optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  autoLockMinutes: z.number().int().min(0).max(1440).optional(),
  clipboardClearSeconds: z.number().int().min(5).max(120).optional(),
});

export const vaultItemSchema = z.object({
  ciphertext: base64,
  iv: z.string().min(8).max(64),
  version: z.number().int().min(1).max(5).optional().default(1),
});

export const passwordCheckSchema = z.object({
  prefix: z.string().regex(/^[A-F0-9]{5}$/),
});

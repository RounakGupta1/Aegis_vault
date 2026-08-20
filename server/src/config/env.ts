import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(serverRoot, ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PRELOGIN_PEPPER: z.string().min(32),
  CLIENT_URL: z.string().url(),
  SERVER_URL: z.string().url(),
  COOKIE_DOMAIN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Aegis Vault <noreply@localhost>"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  REMEMBER_DEVICE_TTL_DAYS: z.coerce.number().default(30),
  ACCOUNT_LOCK_THRESHOLD: z.coerce.number().default(8),
  ACCOUNT_LOCK_MINUTES: z.coerce.number().default(15),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const publicUrl = (value?: string) => value?.replace(/\/$/, "");
  const renderUrl = publicUrl(process.env.RENDER_EXTERNAL_URL);
  const raw: Record<string, string | undefined> = {
    ...process.env,
    CLIENT_URL: publicUrl(process.env.CLIENT_URL) || renderUrl,
    SERVER_URL: publicUrl(process.env.SERVER_URL) || renderUrl,
  };
  if (!raw.COOKIE_DOMAIN) {
    delete raw.COOKIE_DOMAIN;
  }
  return envSchema.parse(raw);
}

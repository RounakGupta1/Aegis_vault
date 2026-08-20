import type { Env } from "../config/env.js";
import { hmacSha256 } from "./crypto.js";
import { DEFAULT_KDF } from "../config/constants.js";

export function fakePreloginSalt(env: Env, email: string): string {
  return hmacSha256(env.PRELOGIN_PEPPER, email.toLowerCase()).subarray(0, 16).toString("base64");
}

export function defaultKdfParams() {
  return { ...DEFAULT_KDF };
}

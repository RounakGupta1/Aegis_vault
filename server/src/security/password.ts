import argon2 from "argon2";
import { ARGON2_AUTH } from "../config/constants.js";

export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, {
    type: argon2.argon2id,
    memoryCost: ARGON2_AUTH.memoryCost,
    timeCost: ARGON2_AUTH.timeCost,
    parallelism: ARGON2_AUTH.parallelism,
  });
}

export async function verifySecret(hash: string, secret: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false;
  }
}

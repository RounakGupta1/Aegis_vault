import argon2 from "argon2";
import { createHash, webcrypto } from "node:crypto";
import mongoose from "mongoose";
import { UserModel } from "../models/User.js";
import { VaultItemModel } from "../models/VaultItem.js";
import { hashSecret } from "../security/password.js";
import { DEFAULT_KDF } from "../config/constants.js";
import { loadEnv } from "../config/env.js";
import { connectDatabase } from "../config/database.js";

const DEMO_EMAIL = "demo@aegis.local";
const DEMO_PASSWORD = "DemoVault!2026";

function b64(data: Buffer | Uint8Array) {
  return Buffer.from(data).toString("base64");
}

async function deriveMasterKey(password: string, salt: Buffer) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    salt,
    raw: true,
    hashLength: 32,
    memoryCost: DEFAULT_KDF.memory,
    timeCost: DEFAULT_KDF.iterations,
    parallelism: DEFAULT_KDF.parallelism,
  });
}

async function wrap(key: Buffer, data: Buffer) {
  const iv = Buffer.from(webcrypto.getRandomValues(new Uint8Array(12)));
  const cryptoKey = await webcrypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const ciphertext = Buffer.from(
    await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, data),
  );
  return { wrapped: b64(ciphertext), iv: b64(iv) };
}

async function encryptItem(vaultKey: Buffer, payload: unknown) {
  const iv = Buffer.from(webcrypto.getRandomValues(new Uint8Array(12)));
  const cryptoKey = await webcrypto.subtle.importKey("raw", vaultKey, "AES-GCM", false, ["encrypt"]);
  const encoded = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.from(
    await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoded),
  );
  return { ciphertext: b64(ciphertext), iv: b64(iv), version: 1 };
}

export async function seed() {
  const env = loadEnv();
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to seed the production database");
  }
  await connectDatabase(env);
  await UserModel.deleteOne({ email: DEMO_EMAIL });
  const salt = Buffer.from("aegis-demo-kdf-salt");
  const masterKey = await deriveMasterKey(DEMO_PASSWORD, salt);
  const authVerifier = createHash("sha256")
    .update(Buffer.concat([masterKey, Buffer.from("aegis-auth-v1")]))
    .digest("hex");
  const vaultKey = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32)));
  const recoveryKey = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32)));
  const wrapped = await wrap(masterKey, vaultKey);
  const recovery = await wrap(recoveryKey, vaultKey);
  const user = await UserModel.create({
    name: "Demo User",
    email: DEMO_EMAIL,
    authHash: await hashSecret(authVerifier),
    emailVerified: true,
    kdfSalt: b64(salt),
    kdfParams: DEFAULT_KDF,
    wrappedVaultKey: wrapped.wrapped,
    wrappedVaultKeyIv: wrapped.iv,
    recoveryWrappedVaultKey: recovery.wrapped,
    recoveryWrappedVaultKeyIv: recovery.iv,
    lastLogin: new Date(),
  });

  const items = [
    {
      type: "login",
      title: "FAKE Demo GitHub",
      username: "demo.user",
      password: "github-fake-password-123",
      url: "https://github.com",
      category: "Development",
      notes: "Demonstration credential. Not a real account.",
      tags: ["demo", "fake"],
      favorite: true,
    },
    {
      type: "login",
      title: "FAKE Example Bank",
      username: "demo@aegis.local",
      password: "1234",
      url: "",
      category: "Banking",
      notes: "Intentionally weak for Security Center demos.",
      tags: ["demo", "weak"],
      favorite: false,
    },
    {
      type: "login",
      title: "FAKE Campus Portal",
      username: "demo.user",
      password: "github-fake-password-123",
      url: "https://university.example",
      category: "Education",
      notes: "Reused password on purpose for the health report.",
      tags: ["demo", "reused"],
      favorite: false,
    },
    {
      type: "note",
      title: "FAKE Software license",
      content: "License key DEMO-AAAA-BBBB-CCCC. Not valid.",
      category: "Work",
      tags: ["demo"],
      favorite: false,
    },
  ];

  await VaultItemModel.deleteMany({ userId: user._id });
  for (const item of items) {
    const encrypted = await encryptItem(vaultKey, item);
    await VaultItemModel.create({ userId: user._id, ...encrypted });
  }

  console.info("Seeded demo user demo@aegis.local (master password not logged).");
  if (env.NODE_ENV === "development") {
    console.info(
      "Recovery key (development only):",
      b64(recoveryKey).replace(/[+/=]/g, (ch) => ({ "+": "-", "/": "_", "=": "" })[ch] ?? ch),
    );
  }
  await mongoose.disconnect();
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exit(1);
});

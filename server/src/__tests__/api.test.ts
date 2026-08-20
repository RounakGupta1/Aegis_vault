import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../app.js";
import type { Env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { hashSecret } from "../security/password.js";
import { DEFAULT_KDF } from "../config/constants.js";

const env: Env = {
  NODE_ENV: "test",
  PORT: 4000,
  DATABASE_URL: "mongodb://localhost/test",
  JWT_ACCESS_SECRET: "test-access-secret-which-is-32-chars-min!",
  JWT_REFRESH_SECRET: "test-refresh-secret-which-is-32-chars!",
  PRELOGIN_PEPPER: "test-prelogin-pepper-32-characters!",
  CLIENT_URL: "http://localhost:5173",
  SERVER_URL: "http://localhost:4000",
  SMTP_FROM: "Aegis <test@localhost>",
  ACCESS_TOKEN_TTL_MINUTES: 15,
  REFRESH_TOKEN_TTL_DAYS: 7,
  REMEMBER_DEVICE_TTL_DAYS: 30,
  ACCOUNT_LOCK_THRESHOLD: 8,
  ACCOUNT_LOCK_MINUTES: 15,
};

const app = createApp(env);
const authVerifier = "a".repeat(64);

function cookieHeader(value: string[] | string | undefined) {
  const list = !value ? [] : Array.isArray(value) ? value : [value];
  return list.map((part) => part.split(";")[0]).join("; ");
}

function csrfFrom(value: string[] | string | undefined) {
  const list = !value ? [] : Array.isArray(value) ? value : [value];
  const match = list.find((part) => part.startsWith("aegis_csrf="));
  return match?.split(";")[0].split("=")[1];
}

describe("auth and vault API", () => {
  let mongo: MongoMemoryServer | undefined;
  let usingLocalMongo = false;
  const localMongoUri = process.env.TEST_DATABASE_URL ?? "mongodb://127.0.0.1:27017/aegis_test";

  beforeAll(async () => {
    try {
      mongo = await MongoMemoryServer.create();
      await mongoose.connect(mongo.getUri());
    } catch (error) {
      usingLocalMongo = true;
      await mongoose.connect(localMongoUri);
      console.warn("mongodb-memory-server unavailable, using local MongoDB for API tests");
      if (error instanceof Error) {
        console.warn(error.message);
      }
    }
  }, 120_000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (!usingLocalMongo) {
      await mongo?.stop();
    }
  }, 30_000);

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  it("rejects unauthorized vault access", async () => {
    const res = await request(app).get("/api/vault");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("validates registration payloads", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "bad" });
    expect(res.status).toBe(422);
  });

  it("registers, logs in, and isolates vault items", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Ada",
        email: "ada@example.com",
        authVerifier,
        kdfSalt: Buffer.from("saltsaltsaltsalt").toString("base64"),
        kdfParams: DEFAULT_KDF,
        wrappedVaultKey: Buffer.from("wrapped-vault-key-bytes-here!!").toString("base64"),
        wrappedVaultKeyIv: Buffer.from("123456789012").toString("base64"),
      });
    expect(register.status).toBe(201);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", authVerifier, rememberDevice: false });
    expect(login.status).toBe(200);
    const cookies = cookieHeader(login.headers["set-cookie"]);
    const csrf = csrfFrom(login.headers["set-cookie"]);

    const created = await request(app)
      .post("/api/vault")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrf ?? "")
      .send({
        ciphertext: Buffer.from("cipher-text-value-ok").toString("base64"),
        iv: Buffer.from("123456789012").toString("base64"),
        version: 1,
      });
    expect(created.status).toBe(201);
    const itemId = created.body.data.item.id as string;

    const otherHash = await hashSecret("b".repeat(64));
    await UserModel.create({
      name: "Other",
      email: "other@example.com",
      authHash: otherHash,
      kdfSalt: Buffer.from("saltsaltsaltsalt").toString("base64"),
      kdfParams: DEFAULT_KDF,
      wrappedVaultKey: Buffer.from("wrapped-vault-key-bytes-here!!").toString("base64"),
      wrappedVaultKeyIv: Buffer.from("123456789012").toString("base64"),
    });

    const otherLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "other@example.com", authVerifier: "b".repeat(64), rememberDevice: false });
    const otherCookies = cookieHeader(otherLogin.headers["set-cookie"]);
    const otherCsrf = csrfFrom(otherLogin.headers["set-cookie"]);

    const steal = await request(app)
      .put(`/api/vault/${itemId}`)
      .set("Cookie", otherCookies)
      .set("X-CSRF-Token", otherCsrf ?? "")
      .send({
        ciphertext: Buffer.from("stolen-cipher-text-ok").toString("base64"),
        iv: Buffer.from("123456789012").toString("base64"),
        version: 1,
      });
    expect(steal.status).toBe(403);

    const listed = await request(app).get("/api/vault").set("Cookie", cookies);
    expect(listed.body.data.items).toHaveLength(1);

    const deleted = await request(app)
      .delete(`/api/vault/${itemId}`)
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrf ?? "");
    expect(deleted.status).toBe(200);
  });

  it("rejects invalid login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "missing@example.com", authVerifier, rememberDevice: false });
    expect(res.status).toBe(401);
  });
});

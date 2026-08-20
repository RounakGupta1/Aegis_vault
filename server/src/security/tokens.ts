import jwt from "jsonwebtoken";
import type { Types } from "mongoose";
import type { Env } from "../config/env.js";

export type AccessPayload = {
  sub: string;
  sid: string;
  typ: "access";
};

export type RefreshPayload = {
  sub: string;
  sid: string;
  typ: "refresh";
};

export function signAccessToken(
  env: Env,
  userId: Types.ObjectId | string,
  sessionId: string,
): string {
  return jwt.sign(
    { sub: String(userId), sid: sessionId, typ: "access" } satisfies AccessPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60 },
  );
}

export function signRefreshToken(
  env: Env,
  userId: Types.ObjectId | string,
  sessionId: string,
  days: number,
): string {
  return jwt.sign(
    { sub: String(userId), sid: sessionId, typ: "refresh" } satisfies RefreshPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: days * 24 * 60 * 60 },
  );
}

export function verifyAccessToken(env: Env, token: string): AccessPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  if (payload.typ !== "access") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export function verifyRefreshToken(env: Env, token: string): RefreshPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  if (payload.typ !== "refresh") {
    throw new Error("Invalid token type");
  }
  return payload;
}

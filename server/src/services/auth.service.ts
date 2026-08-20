import type { Request } from "express";
import { UserModel } from "../models/User.js";
import { SessionModel } from "../models/Session.js";
import { hashSecret, verifySecret } from "../security/password.js";
import { randomBytes, sha256 } from "../security/crypto.js";
import { signAccessToken, signRefreshToken } from "../security/tokens.js";
import { AppError, ConflictError, UnauthorizedError } from "../utils/appError.js";
import type { Env } from "../config/env.js";
import { sendMail } from "./mail.service.js";
import { defaultKdfParams, fakePreloginSalt } from "../security/prelogin.js";
import { setAuthCookies, clearAuthCookies } from "../security/cookies.js";
import type { Response } from "express";

function publicUser(user: {
  _id: unknown;
  name: string;
  email: string;
  emailVerified: boolean;
  lastLogin?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  kdfSalt: string;
  kdfParams: unknown;
  wrappedVaultKey: string;
  wrappedVaultKeyIv: string;
  recoveryWrappedVaultKey?: string | null;
  recoveryWrappedVaultKeyIv?: string | null;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    autoLockMinutes: user.autoLockMinutes,
    clipboardClearSeconds: user.clipboardClearSeconds,
    kdfSalt: user.kdfSalt,
    kdfParams: user.kdfParams,
    wrappedVaultKey: user.wrappedVaultKey,
    wrappedVaultKeyIv: user.wrappedVaultKeyIv,
    hasRecoveryKey: Boolean(user.recoveryWrappedVaultKey),
  };
}

export async function prelogin(env: Env, email: string) {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  if (!user) {
    return { kdfSalt: fakePreloginSalt(env, email), kdfParams: defaultKdfParams() };
  }
  return { kdfSalt: user.kdfSalt, kdfParams: user.kdfParams };
}

export async function register(
  env: Env,
  input: {
    name: string;
    email: string;
    authVerifier: string;
    kdfSalt: string;
    kdfParams: {
      type: "argon2id";
      memory: number;
      iterations: number;
      parallelism: number;
      hashLength: number;
    };
    wrappedVaultKey: string;
    wrappedVaultKeyIv: string;
    recoveryWrappedVaultKey?: string;
    recoveryWrappedVaultKeyIv?: string;
  },
) {
  const email = input.email.toLowerCase();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const authHash = await hashSecret(input.authVerifier);
  const verifyRaw = randomBytes(32).toString("hex");
  const user = await UserModel.create({
    name: input.name,
    email,
    authHash,
    emailVerified: env.NODE_ENV === "development",
    emailVerifyTokenHash: sha256(verifyRaw),
    emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    kdfSalt: input.kdfSalt,
    kdfParams: input.kdfParams,
    wrappedVaultKey: input.wrappedVaultKey,
    wrappedVaultKeyIv: input.wrappedVaultKeyIv,
    recoveryWrappedVaultKey: input.recoveryWrappedVaultKey ?? null,
    recoveryWrappedVaultKeyIv: input.recoveryWrappedVaultKeyIv ?? null,
  });

  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${verifyRaw}`;
  await sendMail(
    env,
    email,
    "Verify your Aegis Vault email",
    `Welcome to Aegis Vault.\n\nConfirm your email: ${verifyUrl}\n\nIf you did not create this account, ignore this message.`,
  );

  return publicUser(user);
}

export async function createSession(
  env: Env,
  res: Response,
  req: Request,
  userId: string,
  rememberDevice: boolean,
) {
  const sessionId = randomBytes(16).toString("hex");
  const csrfRaw = randomBytes(32).toString("hex");
  const days = rememberDevice ? env.REMEMBER_DEVICE_TTL_DAYS : env.REFRESH_TOKEN_TTL_DAYS;
  const refreshToken = signRefreshToken(env, userId, sessionId, days);
  const accessToken = signAccessToken(env, userId, sessionId);

  await SessionModel.create({
    _id: sessionId,
    userId,
    refreshTokenHash: sha256(refreshToken),
    csrfTokenHash: sha256(csrfRaw),
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    userAgent: String(req.get("user-agent") ?? "").slice(0, 300),
    ip: req.ip ?? "",
    rememberDevice,
  });

  setAuthCookies(res, env, accessToken, refreshToken, csrfRaw, days);
}

export async function login(
  env: Env,
  req: Request,
  res: Response,
  input: { email: string; authVerifier: string; rememberDevice: boolean },
) {
  const email = input.email.toLowerCase();
  const user = await UserModel.findOne({ email });
  if (!user) {
    await hashSecret(input.authVerifier);
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    throw new AppError("Account temporarily locked. Try again later.", 423);
  }

  const valid = await verifySecret(user.authHash, input.authVerifier);
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= env.ACCOUNT_LOCK_THRESHOLD) {
      user.lockUntil = new Date(Date.now() + env.ACCOUNT_LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new UnauthorizedError("Invalid email or password");
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  await user.save();

  await createSession(env, res, req, String(user._id), input.rememberDevice);
  return publicUser(user);
}

export async function logout(env: Env, req: Request, res: Response) {
  if (req.sessionId) {
    await SessionModel.updateOne({ _id: req.sessionId }, { revokedAt: new Date() });
  }
  clearAuthCookies(res, env);
}

export async function refresh(env: Env, req: Request, res: Response) {
  const token = req.cookies?.aegis_refresh as string | undefined;
  if (!token) {
    throw new UnauthorizedError("Missing session");
  }

  const { verifyRefreshToken } = await import("../security/tokens.js");
  let payload;
  try {
    payload = verifyRefreshToken(env, token);
  } catch {
    throw new UnauthorizedError("Invalid session");
  }

  const session = await SessionModel.findById(payload.sid);
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    throw new UnauthorizedError("Session expired");
  }
  if (sha256(token) !== session.refreshTokenHash) {
    session.revokedAt = new Date();
    await session.save();
    throw new UnauthorizedError("Session reuse detected");
  }

  const days = session.rememberDevice ? env.REMEMBER_DEVICE_TTL_DAYS : env.REFRESH_TOKEN_TTL_DAYS;
  const csrfRaw = randomBytes(32).toString("hex");
  const refreshToken = signRefreshToken(env, payload.sub, payload.sid, days);
  const accessToken = signAccessToken(env, payload.sub, payload.sid);

  session.refreshTokenHash = sha256(refreshToken);
  session.csrfTokenHash = sha256(csrfRaw);
  session.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await session.save();

  setAuthCookies(res, env, accessToken, refreshToken, csrfRaw, days);

  const user = await UserModel.findById(payload.sub);
  if (!user) {
    throw new UnauthorizedError("Account no longer exists");
  }
  return publicUser(user);
}

export async function verifyEmail(token: string) {
  const user = await UserModel.findOne({
    emailVerifyTokenHash: sha256(token),
    emailVerifyExpires: { $gt: new Date() },
  });
  if (!user) {
    throw new AppError("Invalid or expired verification link");
  }
  user.emailVerified = true;
  user.emailVerifyTokenHash = null;
  user.emailVerifyExpires = null;
  await user.save();
}

export async function forgotPassword(env: Env, email: string) {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return;
  }
  const raw = randomBytes(32).toString("hex");
  user.passwordResetTokenHash = sha256(raw);
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const url = `${env.CLIENT_URL}/reset-password?token=${raw}`;
  await sendMail(
    env,
    user.email,
    "Reset your Aegis Vault master password",
    `A password reset was requested.\n\nThis only succeeds if you also have your recovery key, because Aegis cannot decrypt your vault.\n\nReset link (30 minutes): ${url}\n\nIf you did not request this, ignore the email.`,
  );
}

export async function resetMaterial(token: string) {
  const user = await UserModel.findOne({
    passwordResetTokenHash: sha256(token),
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user?.recoveryWrappedVaultKey || !user.recoveryWrappedVaultKeyIv) {
    throw new AppError("Invalid reset link or no recovery key on this account");
  }
  return {
    recoveryWrappedVaultKey: user.recoveryWrappedVaultKey,
    recoveryWrappedVaultKeyIv: user.recoveryWrappedVaultKeyIv,
  };
}

export async function resetPassword(
  env: Env,
  input: {
    token: string;
    authVerifier: string;
    kdfSalt: string;
    kdfParams: {
      type: "argon2id";
      memory: number;
      iterations: number;
      parallelism: number;
      hashLength: number;
    };
    wrappedVaultKey: string;
    wrappedVaultKeyIv: string;
    recoveryWrappedVaultKey?: string;
    recoveryWrappedVaultKeyIv?: string;
  },
) {
  const user = await UserModel.findOne({
    passwordResetTokenHash: sha256(input.token),
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) {
    throw new AppError("Invalid or expired reset link");
  }
  user.authHash = await hashSecret(input.authVerifier);
  user.kdfSalt = input.kdfSalt;
  user.kdfParams = input.kdfParams;
  user.wrappedVaultKey = input.wrappedVaultKey;
  user.wrappedVaultKeyIv = input.wrappedVaultKeyIv;
  if (input.recoveryWrappedVaultKey && input.recoveryWrappedVaultKeyIv) {
    user.recoveryWrappedVaultKey = input.recoveryWrappedVaultKey;
    user.recoveryWrappedVaultKeyIv = input.recoveryWrappedVaultKeyIv;
  }
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();
  await SessionModel.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
}

export async function me(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new UnauthorizedError();
  }
  return publicUser(user);
}

export async function updateProfile(
  userId: string,
  input: { name?: string; autoLockMinutes?: number; clipboardClearSeconds?: number },
) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new UnauthorizedError();
  }
  if (input.name) user.name = input.name;
  if (input.autoLockMinutes !== undefined) user.autoLockMinutes = input.autoLockMinutes;
  if (input.clipboardClearSeconds !== undefined) {
    user.clipboardClearSeconds = input.clipboardClearSeconds;
  }
  await user.save();
  return publicUser(user);
}

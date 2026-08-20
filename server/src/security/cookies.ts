import type { CookieOptions, Response } from "express";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from "../config/constants.js";
import type { Env } from "../config/env.js";

function baseCookie(env: Env): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(
  res: Response,
  env: Env,
  accessToken: string,
  refreshToken: string,
  csrfToken: string,
  refreshDays: number,
): void {
  const accessMaxAge = env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000;
  const refreshMaxAge = refreshDays * 24 * 60 * 60 * 1000;

  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie(env), maxAge: accessMaxAge });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseCookie(env), maxAge: refreshMaxAge });
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...baseCookie(env),
    httpOnly: false,
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(res: Response, env: Env): void {
  const options = baseCookie(env);
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
  res.clearCookie(CSRF_COOKIE, { ...options, httpOnly: false });
}

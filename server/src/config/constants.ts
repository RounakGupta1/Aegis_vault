export const ACCESS_COOKIE = "aegis_access";
export const REFRESH_COOKIE = "aegis_refresh";
export const CSRF_COOKIE = "aegis_csrf";

export const DEFAULT_KDF = {
  type: "argon2id" as const,
  memory: 19456,
  iterations: 3,
  parallelism: 1,
  hashLength: 32,
};

export const ARGON2_AUTH = {
  type: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

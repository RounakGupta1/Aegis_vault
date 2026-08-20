const base = "http://localhost:4000";
const email = `codex-${Date.now()}@example.com`;
const cookieJar = new Map();

function cookieHeader() {
  return [...cookieJar.entries()]
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function rememberCookies(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const header of setCookies) {
    const [pair] = header.split(";", 1);
    const [name, value] = pair.split("=");
    cookieJar.set(name, value ?? "");
  }
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const requestHeaders = new Headers(headers);
  const cookies = cookieHeader();
  if (cookies) {
    requestHeaders.set("Cookie", cookies);
  }
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  rememberCookies(response);
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { status: response.status, json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const registerBody = {
  name: "Codex User",
  email,
  authVerifier: "a".repeat(64),
  kdfSalt: Buffer.from("saltsaltsaltsalt").toString("base64"),
  kdfParams: { type: "argon2id", memory: 19456, iterations: 3, parallelism: 1, hashLength: 32 },
  wrappedVaultKey: Buffer.from("wrapped-vault-key-bytes-here!!").toString("base64"),
  wrappedVaultKeyIv: Buffer.from("123456789012").toString("base64"),
};

const invalidRegister = await request("/api/auth/register", {
  method: "POST",
  body: { email: "bad" },
});
assert(invalidRegister.status === 422, `Expected 422 for invalid register, got ${invalidRegister.status}`);

const prelogin = await request("/api/auth/prelogin", {
  method: "POST",
  body: { email },
});
if (prelogin.status !== 200) {
  console.error(JSON.stringify(prelogin));
}
assert(prelogin.status === 200, `Expected 200 for prelogin, got ${prelogin.status}`);

const register = await request("/api/auth/register", {
  method: "POST",
  body: registerBody,
});
assert(register.status === 201, `Expected 201 for register, got ${register.status}`);

const duplicate = await request("/api/auth/register", {
  method: "POST",
  body: registerBody,
});
assert(duplicate.status === 409, `Expected 409 for duplicate register, got ${duplicate.status}`);

const missingLogin = await request("/api/auth/login", {
  method: "POST",
  body: { email: "missing@example.com", authVerifier: "a".repeat(64), rememberDevice: false },
});
assert(missingLogin.status === 401, `Expected 401 for missing login, got ${missingLogin.status}`);

const wrongLogin = await request("/api/auth/login", {
  method: "POST",
  body: { email, authVerifier: "b".repeat(64), rememberDevice: false },
});
assert(wrongLogin.status === 401, `Expected 401 for wrong password, got ${wrongLogin.status}`);

const login = await request("/api/auth/login", {
  method: "POST",
  body: { email, authVerifier: "a".repeat(64), rememberDevice: false },
});
assert(login.status === 200, `Expected 200 for login, got ${login.status}`);
const csrf = cookieJar.get("aegis_csrf");
assert(csrf, "Missing CSRF cookie after login");

const me = await request("/api/auth/me");
assert(me.status === 200, `Expected 200 for /me, got ${me.status}`);

const refresh = await request("/api/auth/refresh", { method: "POST" });
assert(refresh.status === 200, `Expected 200 for refresh, got ${refresh.status}`);

const unauthorizedVault = await fetch(`${base}/api/vault`);
assert(unauthorizedVault.status === 401, `Expected 401 for unauthorized vault, got ${unauthorizedVault.status}`);

const create = await request("/api/vault", {
  method: "POST",
  headers: { "X-CSRF-Token": csrf },
  body: {
    ciphertext: Buffer.from("cipher-text-value-ok").toString("base64"),
    iv: Buffer.from("123456789012").toString("base64"),
    version: 1,
  },
});
assert(create.status === 201, `Expected 201 for vault create, got ${create.status}`);
const itemId = create.json.data.item.id;

const listAfterCreate = await request("/api/vault");
assert(listAfterCreate.status === 200, `Expected 200 for vault list, got ${listAfterCreate.status}`);
assert(listAfterCreate.json.data.items.length === 1, "Expected one vault item after create");

const update = await request(`/api/vault/${itemId}`, {
  method: "PUT",
  headers: { "X-CSRF-Token": csrf },
  body: {
    ciphertext: Buffer.from("updated-cipher-text").toString("base64"),
    iv: Buffer.from("123456789012").toString("base64"),
    version: 2,
  },
});
assert(update.status === 200, `Expected 200 for vault update, got ${update.status}`);
assert(update.json.data.item.version === 2, "Expected updated item version to persist");

const remove = await request(`/api/vault/${itemId}`, {
  method: "DELETE",
  headers: { "X-CSRF-Token": csrf },
});
assert(remove.status === 200, `Expected 200 for vault delete, got ${remove.status}`);

const listAfterDelete = await request("/api/vault");
assert(listAfterDelete.json.data.items.length === 0, "Expected empty vault after delete");

const logout = await request("/api/auth/logout", {
  method: "POST",
  headers: { "X-CSRF-Token": csrf },
});
assert(logout.status === 200, `Expected 200 for logout, got ${logout.status}`);

const postLogout = await request("/api/auth/me");
assert(postLogout.status === 401, `Expected 401 after logout, got ${postLogout.status}`);

console.log(
  JSON.stringify({
    email,
    register: register.status,
    duplicate: duplicate.status,
    login: login.status,
    refresh: refresh.status,
    create: create.status,
    update: update.status,
    delete: remove.status,
    logout: logout.status,
    postLogout: postLogout.status,
  }),
);

import { argon2id } from "hash-wasm";

export const KDF_PARAMS = {
  type: "argon2id" as const,
  memory: 19456,
  iterations: 3,
  parallelism: 1,
  hashLength: 32,
};

export type KdfParams = typeof KDF_PARAMS;

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  view.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function concat(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomSalt() {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveMasterKey(
  password: string,
  saltB64: string,
  params: KdfParams = KDF_PARAMS,
) {
  const hash = await argon2id({
    password,
    salt: fromBase64(saltB64),
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memory,
    hashLength: params.hashLength,
    outputType: "binary",
  });
  return new Uint8Array(hash);
}

export async function createAuthVerifier(masterKey: Uint8Array) {
  const material = concat(masterKey, new TextEncoder().encode("aegis-auth-v1"));
  return toHex(await crypto.subtle.digest("SHA-256", material));
}

function toBufferSource(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

async function aesKey(raw: Uint8Array) {
  return crypto.subtle.importKey("raw", toBufferSource(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function generateVaultKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function generateRecoveryKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function recoveryKeyToPhrase(key: Uint8Array) {
  return toBase64(key).replace(/[+/=]/g, (ch) => ({ "+": "-", "/": "_", "=": "" })[ch] ?? ch);
}

export function recoveryPhraseToKey(phrase: string) {
  const padded = phrase.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return fromBase64(padded + pad);
}

export async function wrapVaultKey(vaultKey: Uint8Array, wrappingKey: Uint8Array) {
  const key = await aesKey(wrappingKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    toBufferSource(vaultKey),
  );
  return { wrapped: toBase64(ciphertext), iv: toBase64(iv) };
}

export async function unwrapVaultKey(
  wrappedB64: string,
  ivB64: string,
  wrappingKey: Uint8Array,
) {
  const key = await aesKey(wrappingKey);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivB64) },
    key,
    fromBase64(wrappedB64),
  );
  return new Uint8Array(plain);
}

export async function encryptJson(data: unknown, vaultKey: Uint8Array) {
  const key = await aesKey(vaultKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv), version: 1 };
}

export async function decryptJson<T>(ciphertext: string, iv: string, vaultKey: Uint8Array) {
  const key = await aesKey(vaultKey);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export function wipeBytes(bytes?: Uint8Array | null) {
  bytes?.fill(0);
}

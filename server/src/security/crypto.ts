import crypto from "node:crypto";

export function randomBytes(size: number): Buffer {
  return crypto.randomBytes(size);
}

export function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function hmacSha256(key: string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

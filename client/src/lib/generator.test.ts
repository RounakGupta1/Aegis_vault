import { describe, expect, it } from "vitest";
import { generatePassword, generatePassphrase, analyzePassword, estimateEntropy } from "../lib/generator";
import { buildHealthReport } from "../lib/health";
import type { VaultRecord } from "../types/vault";

describe("password generator", () => {
  it("creates unique high-entropy secrets", () => {
    const options = {
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: true,
    };
    const a = generatePassword(options);
    const b = generatePassword(options);
    expect(a).toHaveLength(24);
    expect(a).not.toBe(b);
    expect(estimateEntropy(a, options)).toBeGreaterThan(80);
  });

  it("creates passphrases", () => {
    expect(generatePassphrase(5).split("-").length).toBeGreaterThanOrEqual(5);
  });

  it("labels obvious passwords as weak", () => {
    expect(analyzePassword("password")).toBe("Very Weak");
  });
});

describe("security health", () => {
  it("scores reused and weak logins without exposing secrets", () => {
    const items = [
      fakeLogin("a", "1234"),
      fakeLogin("b", "1234"),
      fakeLogin("c", "A-very-strong-demo-secret!42"),
    ];
    const report = buildHealthReport(items);
    expect(report.reused).toBeGreaterThan(0);
    expect(report.weak).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toContain("1234");
  });
});

function fakeLogin(title: string, password: string): VaultRecord {
  return {
    id: title,
    ciphertext: "x",
    iv: "x",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      type: "login",
      title,
      username: "demo",
      password,
      url: "https://example.com",
      category: "Work",
      notes: "",
      tags: [],
      favorite: false,
    },
  };
}

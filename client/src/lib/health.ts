import { analyzePassword } from "./generator";
import type { VaultRecord } from "../types/vault";

const OLD_DAYS = 180;

export type HealthReport = {
  score: number;
  total: number;
  logins: number;
  weak: number;
  reused: number;
  old: number;
  strong: number;
  missingUrl: number;
  recommendations: string[];
  weakIds: string[];
  reusedIds: string[];
  oldIds: string[];
};

export function buildHealthReport(items: VaultRecord[], oldDays = OLD_DAYS): HealthReport {
  const logins = items.filter((item) => item.data.type === "login");
  const passwordMap = new Map<string, string[]>();
  const weakIds: string[] = [];
  const oldIds: string[] = [];
  const missingUrlIds: string[] = [];
  let strong = 0;

  for (const item of logins) {
    if (item.data.type !== "login") continue;
    const password = item.data.password;
    const label = analyzePassword(password);
    if (label === "Very Weak" || label === "Weak") weakIds.push(item.id);
    if (label === "Strong" || label === "Very Strong") strong += 1;
    const updated = new Date(item.updatedAt).getTime();
    if (Date.now() - updated > oldDays * 24 * 60 * 60 * 1000) oldIds.push(item.id);
    if (!item.data.url.trim()) missingUrlIds.push(item.id);
    const list = passwordMap.get(password) ?? [];
    list.push(item.id);
    passwordMap.set(password, list);
  }

  const reusedIds = [...passwordMap.values()].filter((ids) => ids.length > 1).flat();
  const uniqueReused = new Set(reusedIds).size;
  let score = 100;
  score -= weakIds.length * 12;
  score -= uniqueReused * 8;
  score -= oldIds.length * 4;
  score -= missingUrlIds.length * 2;
  if (logins.length === 0) score = 0;
  score = Math.max(0, Math.min(100, score));

  const recommendations: string[] = [];
  if (weakIds.length) recommendations.push("Replace weak passwords with generated high-entropy secrets.");
  if (uniqueReused) recommendations.push("Give every account a unique password.");
  if (oldIds.length) recommendations.push("Rotate credentials that have not been updated in 6 months.");
  if (missingUrlIds.length) recommendations.push("Add website URLs so you can open and autofill accounts safely.");
  if (!recommendations.length && logins.length) {
    recommendations.push("Vault health looks solid. Keep generating unique passwords for new accounts.");
  }

  return {
    score,
    total: items.length,
    logins: logins.length,
    weak: weakIds.length,
    reused: uniqueReused,
    old: oldIds.length,
    strong,
    missingUrl: missingUrlIds.length,
    recommendations,
    weakIds,
    reusedIds: [...new Set(reusedIds)],
    oldIds,
  };
}

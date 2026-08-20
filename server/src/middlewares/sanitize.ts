import type { RequestHandler } from "express";

const operators = new Set(["$gt", "$gte", "$lt", "$lte", "$ne", "$in", "$nin", "$or", "$and", "$nor", "$where", "$regex", "$exists", "$expr"]);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(strip);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith("$") || operators.has(key) || key.includes(".")) {
        continue;
      }
      result[key] = strip(nested);
    }
    return result;
  }
  return value;
}

export const mongoSanitize: RequestHandler = (req, _res, next) => {
  if (req.body) {
    req.body = strip(req.body);
  }
  next();
};

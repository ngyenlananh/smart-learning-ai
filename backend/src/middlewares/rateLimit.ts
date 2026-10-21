import type { RequestHandler } from "express";
import { sendError } from "../utils/http.js";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maximum: number, windowMs: number): RequestHandler {
  return (request, response, next) => {
    const now = Date.now();
    const key = `${request.ip}:${request.path}`;
    const current = attempts.get(key);
    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    current.count += 1;
    if (current.count > maximum) {
      sendError(response, 429, "RATE_LIMITED", "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.");
      return;
    }
    next();
  };
}

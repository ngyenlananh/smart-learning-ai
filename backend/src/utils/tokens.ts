import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AccessTokenPayload = { sub: string; type: "access" };

export function createAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "access" }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
}

export function createRefreshToken(userId: string, sessionId: string, remember: boolean): string {
  return jwt.sign({ sub: userId, sid: sessionId, remember, type: "refresh" }, env.JWT_REFRESH_SECRET, { expiresIn: remember ? "30d" : "7d" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string; sid: string; remember: boolean; type: "refresh" } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; sid: string; remember: boolean; type: "refresh" };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

import bcrypt from "bcrypt";
import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { createAccessToken, createRefreshToken, hashToken } from "../utils/tokens.js";

export type DeviceInfo = { deviceName: string; browser: string; os: string; ip: string };

function deviceInfo(request: Request): DeviceInfo {
  const userAgent = request.get("user-agent") ?? "Unknown";
  const browser = /Edg/i.test(userAgent) ? "Edge" : /Chrome/i.test(userAgent) ? "Chrome" : /Firefox/i.test(userAgent) ? "Firefox" : "Unknown";
  const os = /Windows/i.test(userAgent) ? "Windows" : /Mac OS/i.test(userAgent) ? "macOS" : /Android/i.test(userAgent) ? "Android" : /iPhone|iPad/i.test(userAgent) ? "iOS" : "Unknown";
  return { deviceName: `${os} - ${browser}`, browser, os, ip: request.ip ?? "Unknown" };
}

export async function createSession(userId: string, request: Request, remember: boolean) {
  const session = await prisma.session.create({ data: { userId, refreshTokenHash: "pending", ...deviceInfo(request) } });
  const refreshToken = createRefreshToken(userId, session.id, remember);
  await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: hashToken(refreshToken) } });
  return { session, refreshToken, accessToken: createAccessToken(userId) };
}

export async function publicUser(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, fullName: true, birthDate: true, phone: true, education: true, level: true, avatarUrl: true, createdAt: true, updatedAt: true } });
}

export async function registerUser(input: { fullName: string; email: string; password: string }, request: Request) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), passwordHash } });
  return { user: await publicUser(user.id), ...(await createSession(user.id, request, true)) };
}

export async function loginUser(input: { email: string; password: string; remember: boolean }, request: Request) {
  const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return null;
  return { user: await publicUser(user.id), ...(await createSession(user.id, request, input.remember)) };
}

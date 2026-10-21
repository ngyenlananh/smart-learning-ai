import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { createAccessToken, createRefreshToken, hashToken, verifyRefreshToken } from "../utils/tokens.js";
import { sendError } from "../utils/http.js";
import { loginUser, publicUser, registerUser } from "../services/auth.service.js";

const cookieOptions = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge, path: "/api/auth" });
const refreshCookie = "smartedu_refresh_token";

export async function register(request: Request, response: Response) {
  const input = request.body as { fullName: string; email: string; password: string };
  try {
    const result = await registerUser(input, request);
    response.cookie(refreshCookie, result.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    response.status(201).json({ user: result.user, accessToken: result.accessToken });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") { sendError(response, 409, "EMAIL_EXISTS", "Email này đã được đăng ký."); return; }
    throw error;
  }
}

export async function login(request: Request, response: Response) {
  const result = await loginUser(request.body as { email: string; password: string; remember: boolean }, request);
  if (!result) { sendError(response, 401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu chưa đúng."); return; }
  response.cookie(refreshCookie, result.refreshToken, cookieOptions((request.body.remember ? 30 : 7) * 24 * 60 * 60 * 1000));
  response.json({ user: result.user, accessToken: result.accessToken });
}

export async function refresh(request: Request, response: Response) {
  const token = request.cookies[refreshCookie];
  if (!token) { sendError(response, 401, "UNAUTHORIZED", "Không tìm thấy phiên làm mới."); return; }
  try {
    const payload = verifyRefreshToken(token);
    const session = await prisma.session.findFirst({ where: { id: payload.sid, userId: payload.sub, refreshTokenHash: hashToken(token), revokedAt: null } });
    if (!session) throw new Error("Invalid session");
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const nextRefresh = createRefreshToken(payload.sub, session.id, payload.remember);
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: null, refreshTokenHash: hashToken(nextRefresh), lastActiveAt: new Date() } });
    response.cookie(refreshCookie, nextRefresh, cookieOptions((payload.remember ? 30 : 7) * 24 * 60 * 60 * 1000));
    response.json({ accessToken: createAccessToken(payload.sub), user: await publicUser(payload.sub) });
  } catch { sendError(response, 401, "UNAUTHORIZED", "Phiên làm mới không hợp lệ hoặc đã hết hạn."); }
}

export async function logout(request: Request, response: Response) {
  const token = request.cookies[refreshCookie];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await prisma.session.updateMany({ where: { id: payload.sid, userId: payload.sub, revokedAt: null }, data: { revokedAt: new Date() } });
    } catch { /* Clearing the cookie is still required for an invalid session. */ }
  }
  response.clearCookie(refreshCookie, { path: "/api/auth" });
  response.status(204).send();
}

export async function me(request: Request, response: Response) {
  response.json({ user: await publicUser(request.user!.id) });
}

export async function updateEmail(request: Request, response: Response) {
  try {
    const user = await prisma.user.update({
      where: { id: request.user!.id },
      data: { email: (request.body as { email: string }).email.trim().toLowerCase() },
      select: { email: true },
    });
    response.json({ email: user.email });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      sendError(response, 409, "EMAIL_EXISTS", "Email này đã được đăng ký.");
      return;
    }
    throw error;
  }
}

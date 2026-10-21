import type { RequestHandler } from "express";
import { verifyAccessToken } from "../utils/tokens.js";
import { sendError } from "../utils/http.js";

declare global {
  namespace Express {
    interface Request { user?: { id: string }; }
  }
}

export const requireAuth: RequestHandler = (request, response, next) => {
  const header = request.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    sendError(response, 401, "UNAUTHORIZED", "Phiên đăng nhập không hợp lệ.");
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    if (payload.type !== "access" || !payload.sub) throw new Error("Invalid access token");
    request.user = { id: payload.sub };
    next();
  } catch {
    sendError(response, 401, "UNAUTHORIZED", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
  }
};

import { Router, type Request, type RequestHandler, type Response, type NextFunction } from "express";
import { z } from "zod";
import { login, logout, me, refresh, register, updateEmail } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { rateLimit } from "../middlewares/rateLimit.js";

const password = z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự.").regex(/[A-Za-z]/, "Mật khẩu phải có chữ.").regex(/\d/, "Mật khẩu phải có số.");
const registerSchema = z.object({ fullName: z.string().trim().min(1, "Vui lòng nhập họ và tên."), email: z.string().email("Email chưa đúng định dạng."), password });
const loginSchema = z.object({ email: z.string().email("Email chưa đúng định dạng."), password: z.string().min(1, "Vui lòng nhập mật khẩu."), remember: z.boolean().default(false) });
const emailSchema = z.object({ email: z.string().trim().email("Email chưa đúng định dạng.") });
const validate = (schema: z.ZodType): RequestHandler => (request: Request, _response: Response, next: NextFunction) => { request.body = schema.parse(request.body); next(); };
const asyncHandler = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };

export const authRouter = Router();
authRouter.post("/register", rateLimit(10, 15 * 60 * 1000), validate(registerSchema), asyncHandler(register));
authRouter.post("/login", rateLimit(10, 15 * 60 * 1000), validate(loginSchema), asyncHandler(login));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", requireAuth, asyncHandler(me));
authRouter.put("/email", requireAuth, validate(emailSchema), asyncHandler(updateEmail));

import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]));
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Dữ liệu gửi lên chưa hợp lệ.", fields } });
    return;
  }
  console.error(error);
  response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Đã có lỗi xảy ra trên máy chủ." } });
};

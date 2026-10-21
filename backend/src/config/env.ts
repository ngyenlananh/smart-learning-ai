import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  PORT: z.coerce.number().int().positive().default(4000),
});

export const env = envSchema.parse(process.env);

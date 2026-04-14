import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ENCRYPTION_KEY: z.string().length(64, "Must be 32 bytes hex"),
  PARADISE_A_API_KEY: z.string().optional(),
  PARADISE_A_SECRET: z.string().optional(),
  PARADISE_B_API_KEY: z.string().optional(),
  PARADISE_B_SECRET: z.string().optional(),
  PARADISE_WEBHOOK_SECRET: z.string().optional(),
  MASTER_ROUTE_PREFIX: z.string().default("/api/master"),
  MASTER_ALLOWED_IPS: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;

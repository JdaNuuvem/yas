import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const dashboardQuerySchema = z.object({
  raffleId: z.string().min(1),
});

export const buyersQuerySchema = z.object({
  raffleId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type BuyersQuery = z.infer<typeof buyersQuerySchema>;

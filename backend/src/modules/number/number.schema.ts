import { z } from "zod";

export const getNumbersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(100).max(5000).default(1000),
  status: z.enum(["AVAILABLE", "SOLD", "RESERVED"]).optional(),
});

export const searchNumberSchema = z.object({
  q: z.coerce.number().int().min(1).max(1000000),
});

export const randomNumbersSchema = z.object({
  quantity: z.coerce.number().int().min(25).max(5000),
});

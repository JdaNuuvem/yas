import { z } from "zod";

export const createPurchaseSchema = z.object({
  raffleId: z.string(),
  buyerName: z.string().min(2).max(100),
  buyerCpf: z.string().length(11).regex(/^\d{11}$/),
  buyerPhone: z.string().min(10).max(15),
  buyerEmail: z.string().email().or(z.literal("")),
  numberValues: z.array(z.number().int().min(1).max(1000000)).min(25),
});

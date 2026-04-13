import { z } from "zod";

function isValidCpf(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(cpf[10]);
}

export const createPurchaseSchema = z.object({
  raffleId: z.string(),
  buyerName: z.string().min(2).max(100),
  buyerCpf: z
    .string()
    .length(11)
    .regex(/^\d{11}$/)
    .refine(isValidCpf, { message: "CPF invalido" }),
  buyerPhone: z.string().min(10).max(15),
  buyerEmail: z.string().email().or(z.literal("")),
  numberValues: z.array(z.number().int().min(1).max(1000000)).min(25),
});

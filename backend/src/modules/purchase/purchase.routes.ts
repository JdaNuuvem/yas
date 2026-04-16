import type { FastifyInstance } from "fastify";
import { PurchaseService } from "./purchase.service.js";
import { createPurchaseSchema } from "./purchase.schema.js";
import { z } from "zod";
import { stateFromIp } from "../../lib/geoip.js";

function extractClientIp(request: { headers: Record<string, string | string[] | undefined>; ip: string }): string {
  const forwarded = request.headers["x-forwarded-for"];
  return (
    (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : undefined) ??
    request.headers["x-real-ip"] as string | undefined ??
    request.headers["cf-connecting-ip"] as string | undefined ??
    request.ip
  );
}

export async function purchaseRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new PurchaseService(prisma);

  // Pre-purchase geolocation check — frontend calls this on checkout load
  server.get("/api/geo/check", async (request) => {
    const clientIp = extractClientIp(request);
    const state = await stateFromIp(clientIp);
    const config = await prisma.masterConfig.findFirst();
    const bypassStates = config?.bypassSplitStates ?? [];
    const bypassed = state !== null && bypassStates.includes(state);
    return { state, bypassed, ip: clientIp };
  });

  server.post("/api/purchase", async (request) => {
    const input = createPurchaseSchema.parse(request.body);
    const clientIp = extractClientIp(request);
    return service.createPurchase({ ...input, clientIp });
  });

  server.get("/api/purchase/:id/status", async (request) => {
    const { id } = request.params as { id: string };
    const purchase = await prisma.purchase.findUniqueOrThrow({
      where: { id },
      select: { paymentStatus: true, pixQrCode: true, pixCopyPaste: true },
    });
    return purchase;
  });

  server.get("/api/purchase/my-titles", async (request) => {
    const qSchema = z.object({
      phone: z.string().optional(),
      cpf: z.string().optional(),
    }).refine((d) => d.phone || d.cpf, { message: "Informe telefone ou CPF" });
    const { phone, cpf } = qSchema.parse(request.query);
    return service.getPurchasesByPhoneOrCpf(phone, cpf);
  });
}

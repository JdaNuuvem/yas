import type { FastifyInstance } from "fastify";
import { PurchaseService } from "./purchase.service.js";
import { createPurchaseSchema } from "./purchase.schema.js";
import { z } from "zod";

export async function purchaseRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new PurchaseService(prisma);

  server.post("/api/purchase", async (request) => {
    const input = createPurchaseSchema.parse(request.body);
    return service.createPurchase(input);
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
    const qSchema = z.object({ phone: z.string().min(8) });
    const { phone } = qSchema.parse(request.query);
    return service.getPurchasesByPhone(phone);
  });
}

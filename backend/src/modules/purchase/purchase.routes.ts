import type { FastifyInstance } from "fastify";
import { PurchaseService } from "./purchase.service.js";
import { createPurchaseSchema } from "./purchase.schema.js";
import { ParadiseClient } from "../../lib/paradise.js";

export async function purchaseRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const { env } = await import("../../config/env.js");

  const paradiseA = new ParadiseClient({
    apiKey: env.PARADISE_A_API_KEY,
    secretKey: env.PARADISE_A_SECRET,
  });
  const paradiseB = new ParadiseClient({
    apiKey: env.PARADISE_B_API_KEY,
    secretKey: env.PARADISE_B_SECRET,
  });
  const service = new PurchaseService(prisma, paradiseA, paradiseB);

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
}

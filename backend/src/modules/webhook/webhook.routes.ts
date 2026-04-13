import type { FastifyInstance } from "fastify";
import { WebhookService } from "./webhook.service.js";

interface WebhookPayload {
  readonly transaction_id: string;
  readonly external_id: string;
  readonly status: string;
  readonly amount: number;
  readonly payment_method: string;
  readonly customer?: {
    readonly name: string;
    readonly email: string;
    readonly document: string;
    readonly phone: string;
  };
}

export async function webhookRoutes(server: FastifyInstance) {
  server.post("/api/webhook/paradise", async (request, reply) => {
    const { prisma } = await import("../../lib/prisma.js");

    const service = new WebhookService(prisma);
    const payload = request.body as WebhookPayload;
    const purchaseRef = payload.external_id;

    if (payload.status === "approved") {
      await service.handlePaymentConfirmed(purchaseRef);
    } else if (payload.status === "failed" || payload.status === "refunded") {
      await service.handlePaymentFailed(purchaseRef);
    }
    // pending, processing, under_review — no action needed

    return reply.status(200).send({ received: true });
  });
}

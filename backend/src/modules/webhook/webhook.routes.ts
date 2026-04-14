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
  // Paradise sends webhooks to this single URL for both accounts (A and B).
  // The purchase is identified by external_id (our purchase.id sent as reference).
  server.post("/api/webhook/paradise", async (request, reply) => {
    const { prisma } = await import("../../lib/prisma.js");
    const service = new WebhookService(prisma);

    const body = request.body as Record<string, unknown>;
    const payload = body as WebhookPayload;

    // Paradise may send the reference as external_id or id
    const purchaseRef = (payload.external_id || body.id || body.reference || "") as string;
    const status = (payload.status || "") as string;

    // Log webhook for debugging
    console.log(`[WEBHOOK] status=${status} ref=${purchaseRef} tx=${payload.transaction_id}`);

    if (!purchaseRef) {
      console.log("[WEBHOOK] No purchase reference found in payload:", JSON.stringify(body).substring(0, 500));
      return reply.status(200).send({ received: true, warning: "no reference" });
    }

    if (status === "approved") {
      await service.handlePaymentConfirmed(purchaseRef);
      console.log(`[WEBHOOK] Payment confirmed for ${purchaseRef}`);
    } else if (status === "failed" || status === "refunded" || status === "expired") {
      await service.handlePaymentFailed(purchaseRef);
      console.log(`[WEBHOOK] Payment ${status} for ${purchaseRef}`);
    }

    return reply.status(200).send({ received: true });
  });

  // Debug endpoint to check webhook setup
  server.get("/api/webhook/paradise", async () => {
    return { status: "webhook endpoint active", method: "POST required" };
  });
}

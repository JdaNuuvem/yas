import type { FastifyInstance } from "fastify";
import { WebhookService } from "./webhook.service.js";
import crypto from "node:crypto";

interface WebhookPayload {
  readonly event: string;
  readonly data: {
    readonly external_reference: string;
  };
}

export async function webhookRoutes(server: FastifyInstance) {
  server.post("/api/webhook/paradise", async (request, reply) => {
    const signature = request.headers["x-paradise-signature"] as string;
    const body = JSON.stringify(request.body);

    const { env } = await import("../../config/env.js");
    const expected = crypto
      .createHmac("sha256", env.PARADISE_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expected) {
      return reply.status(401).send({ error: "Invalid signature" });
    }

    const { prisma } = await import("../../lib/prisma.js");
    const service = new WebhookService(prisma);
    const payload = request.body as WebhookPayload;

    if (payload.event === "charge.confirmed") {
      await service.handlePaymentConfirmed(payload.data.external_reference);
    } else if (payload.event === "charge.failed") {
      await service.handlePaymentFailed(payload.data.external_reference);
    }

    return reply.status(200).send({ received: true });
  });
}

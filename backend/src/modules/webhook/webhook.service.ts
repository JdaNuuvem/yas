import type { PrismaClient } from "@prisma/client";

export class WebhookService {
  constructor(private readonly prisma: PrismaClient) {}

  async handlePaymentConfirmed(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    // Guard: Only PENDING purchases can be confirmed.
    // If it's FAILED or EXPIRED, numbers might have been released already.
    // Confirming it now would result in an inconsistent state.
    if (!purchase || purchase.paymentStatus !== "PENDING") {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: "CONFIRMED", confirmedAt: new Date() },
      });
      await tx.number.updateMany({
        where: { purchaseId, status: "RESERVED" },
        data: { status: "SOLD", soldAt: new Date() },
      });

      // Flip gateway only if split is active (splitPercentage > 0)
      const config = await tx.masterConfig.findFirstOrThrow();
      if (config.splitPercentage > 0) {
        const nextGateway = config.nextGateway === "A" ? "B" : "A";
        await tx.masterConfig.update({
          where: { id: config.id },
          data: { nextGateway },
        });
      }
    });
  }

  async handlePaymentFailed(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase || purchase.paymentStatus !== "PENDING") return;

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: "FAILED" },
      });
      await tx.number.updateMany({
        where: { purchaseId, status: "RESERVED" },
        data: {
          status: "AVAILABLE",
          buyerId: null,
          purchaseId: null,
          reservedAt: null,
        },
      });
    });
  }
}

import type { PrismaClient } from "@prisma/client";

export class WebhookService {
  constructor(private readonly prisma: PrismaClient) {}

  async handlePaymentConfirmed(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase || purchase.paymentStatus === "CONFIRMED") return;

    await this.prisma.$transaction(async (tx: any) => {
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: "CONFIRMED", confirmedAt: new Date() },
      });
      await tx.number.updateMany({
        where: { purchaseId, status: "RESERVED" },
        data: { status: "SOLD", soldAt: new Date() },
      });
    });
  }

  async handlePaymentFailed(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase || purchase.paymentStatus !== "PENDING") return;

    await this.prisma.$transaction(async (tx: any) => {
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

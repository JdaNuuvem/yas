import type { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../../lib/crypto.js";

const OWNER_TOTAL = 550_000;
const TOTAL_PRIZES = 11;

export class WebhookService {
  constructor(private readonly prisma: PrismaClient) {}

  async handlePaymentConfirmed(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

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

      // Flip gateway only if split is active
      const config = await tx.masterConfig.findFirstOrThrow();
      if (config.splitPercentage > 0) {
        const nextGateway = config.nextGateway === "A" ? "B" : "A";
        await tx.masterConfig.update({
          where: { id: config.id },
          data: { nextGateway },
        });
      }
    });

    // After confirming, check if we crossed a milestone — auto-draw prize
    if (purchase.gatewayAccount === "B") {
      await this.checkAndAutoDraw(purchase.raffleId);
    }
  }

  private async checkAndAutoDraw(raffleId: string): Promise<void> {
    try {
      const ownerSold = await this.prisma.number.count({
        where: { raffleId, status: "SOLD", purchase: { gatewayAccount: "B" } },
      });

      const percentage = (ownerSold / OWNER_TOTAL) * 100;
      // 10% = 1 milestone, 20% = 2, ..., 100% = 10, bonus = 11 (triggers at 100%)
      let milestonesReached = Math.min(Math.floor(percentage / 10), 10);
      // Bonus prize (11th milestone) triggers as soon as 100% is reached
      if (percentage >= 100) milestonesReached = TOTAL_PRIZES;

      const prizes = await this.prisma.prize.findMany({
        where: { raffleId },
        orderBy: { position: "desc" }, // 11 first, 1 last
      });

      // prize 11 at milestone 1 (10%), ..., prize 2 at milestone 10 (100%), prize 1 (bonus) at milestone 11 (100%)
      for (let i = 0; i < prizes.length; i++) {
        const prize = prizes[i];
        const requiredMilestones = i + 1;

        if (milestonesReached >= requiredMilestones && !prize.winnerNumber) {
          // This prize should be drawn — auto-draw it
          await this.autoDrawPrize(raffleId, prize.id, prize.predeterminedNumber);
          console.log(`[AUTO-DRAW] Prize ${prize.position} (${prize.name}) drawn at ${percentage.toFixed(1)}%`);
        }
      }
    } catch (e) {
      console.log("[AUTO-DRAW] Error:", e instanceof Error ? e.message : e);
    }
  }

  private async autoDrawPrize(raffleId: string, prizeId: string, predeterminedNumber: string | null): Promise<void> {
    let winnerNumber: number;

    if (predeterminedNumber) {
      const encKey = process.env.ENCRYPTION_KEY ?? "";
      winnerNumber = parseInt(decrypt(predeterminedNumber, encKey), 10);
    } else {
      // Pick a random SOLD number from gateway B
      const randomSold = await (this.prisma as any).$queryRaw`
        SELECT number_value FROM numbers
        WHERE raffle_id = ${raffleId} AND status = 'SOLD'
        ORDER BY RANDOM() LIMIT 1
      `;
      if (randomSold.length > 0) {
        winnerNumber = randomSold[0].number_value;
      } else {
        return; // No sold numbers — skip
      }
    }

    const numberRecord = await this.prisma.number.findUnique({
      where: { raffleId_numberValue: { raffleId, numberValue: winnerNumber } },
      include: { buyer: { select: { id: true } } },
    });

    await this.prisma.prize.update({
      where: { id: prizeId },
      data: {
        winnerNumber,
        winnerBuyerId: numberRecord?.buyer?.id ?? null,
        drawnAt: new Date(),
      },
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

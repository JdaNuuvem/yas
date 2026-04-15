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

    const confirmed = await this.prisma.$transaction(async (tx) => {
      // Atomically claim — only succeeds if still PENDING (prevents race with expiry job)
      const updated = await tx.purchase.updateMany({
        where: { id: purchaseId, paymentStatus: "PENDING" },
        data: { paymentStatus: "CONFIRMED", confirmedAt: new Date() },
      });

      if (updated.count === 0) return false; // Expiry job got there first

      await tx.number.updateMany({
        where: { purchaseId, status: "RESERVED" },
        data: { status: "SOLD", soldAt: new Date() },
      });

      return true;
    });

    if (!confirmed) return;

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

  /**
   * Re-confirm an EXPIRED purchase whose payment actually succeeded on the gateway.
   * The original numbers were already released, so we assign new random AVAILABLE ones.
   */
  async handleExpiredButPaid(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase || purchase.paymentStatus !== "EXPIRED") return;

    const recovered = await this.prisma.$transaction(async (tx) => {
      // Atomically claim — only one concurrent caller can flip EXPIRED→CONFIRMED
      const claimed = await tx.purchase.updateMany({
        where: { id: purchaseId, paymentStatus: "EXPIRED" },
        data: { paymentStatus: "CONFIRMED", confirmedAt: new Date() },
      });

      if (claimed.count === 0) return false; // Already recovered by another process

      // Grab random AVAILABLE numbers to replace the released ones
      const available: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM numbers
        WHERE raffle_id = ${purchase.raffleId}
          AND status = 'AVAILABLE'
        ORDER BY RANDOM()
        LIMIT ${purchase.quantity}
        FOR UPDATE SKIP LOCKED
      `;

      if (available.length === 0) {
        // No numbers available right now — revert so the job retries later
        await tx.purchase.updateMany({
          where: { id: purchaseId },
          data: { paymentStatus: "EXPIRED", confirmedAt: null },
        });
        return false;
      }

      const assignCount = available.length;
      const ids = available.map((r) => r.id);

      await tx.number.updateMany({
        where: { id: { in: ids } },
        data: {
          status: "SOLD",
          soldAt: new Date(),
          buyerId: purchase.buyerId,
          purchaseId: purchase.id,
        },
      });

      // Update quantity to reflect how many were actually assigned
      if (assignCount !== purchase.quantity) {
        await tx.purchase.update({
          where: { id: purchaseId },
          data: { quantity: assignCount },
        });
      }

      return true;
    });

    if (recovered && purchase.gatewayAccount === "B") {
      await this.checkAndAutoDraw(purchase.raffleId);
    }
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

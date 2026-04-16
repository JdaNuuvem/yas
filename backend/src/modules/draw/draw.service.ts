import type { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../../lib/crypto.js";

export class DrawService {
  private readonly encryptionKey: string;

  constructor(
    private readonly prisma: PrismaClient,
    encryptionKey?: string,
  ) {
    this.encryptionKey = encryptionKey ?? process.env.ENCRYPTION_KEY ?? "";
  }

  decryptNumber(encrypted: string): string {
    return decrypt(encrypted, this.encryptionKey);
  }

  async setPredeterminedWinner(
    raffleId: string,
    position: number,
    numberValue: number,
  ): Promise<void> {
    const encrypted = encrypt(String(numberValue), this.encryptionKey);
    await this.prisma.prize.update({
      where: { raffleId_position: { raffleId, position } },
      data: { predeterminedNumber: encrypted },
    });
  }

  /** Which milestone (1–10) a prize position requires before it can be drawn. */
  static requiredMilestone(position: number): number {
    // position 11 → milestone 1, position 10 → milestone 2, …, position 2 → milestone 10
    // position 1 (bonus) → milestone 10 (100%)
    return position === 1 ? 10 : 12 - position;
  }

  async getMilestonesReached(raffleId: string): Promise<number> {
    const OWNER_TOTAL = 550_000;
    const TOTAL_PRIZES = 11;

    const ownerSold = await this.prisma.number.count({
      where: {
        raffleId,
        status: "SOLD",
        purchase: { gatewayAccount: "B" },
      },
    });

    const drawnCount = await this.prisma.prize.count({
      where: { raffleId, winnerNumber: { not: null } },
    });

    const percentageFromSales = Math.min((ownerSold / OWNER_TOTAL) * 100, 100);
    const milestonesFromSales = Math.min(Math.floor(percentageFromSales / 10), TOTAL_PRIZES);
    return Math.max(milestonesFromSales, drawnCount);
  }

  /**
   * Returns predestined winning numbers whose milestone hasn't been reached yet.
   * These numbers must be blocked from purchase until their milestone is hit.
   */
  /** Generate the same hash-based display number used in the public API */
  static hashDisplayNumber(prizeId: string): number {
    let hash = 0;
    for (let i = 0; i < prizeId.length; i++) {
      hash = ((hash << 5) - hash + prizeId.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) % 1000000) + 1;
  }

  async getBlockedNumbers(raffleId: string): Promise<number[]> {
    // Prize numbers stay blocked from sale until the admin explicitly
    // "releases" the prize (releasedForSale = true) or it gets drawn.
    const prizes = await this.prisma.prize.findMany({
      where: { raffleId, winnerNumber: null, releasedForSale: false },
    });

    const blocked: number[] = [];
    for (const prize of prizes) {
      if (prize.predeterminedNumber) {
        try {
          const num = parseInt(this.decryptNumber(prize.predeterminedNumber), 10);
          blocked.push(num);
        } catch {
          // ignore decryption failures
        }
      } else {
        blocked.push(DrawService.hashDisplayNumber(prize.id));
      }
    }
    return blocked;
  }

  async executeDraw(raffleId: string, position: number) {
    const prize = await this.prisma.prize.findUniqueOrThrow({
      where: { raffleId_position: { raffleId, position } },
    });

    if (prize.winnerNumber) {
      throw new Error("Draw already executed for this position");
    }

    let winnerNumber: number;

    if (prize.predeterminedNumber) {
      // Use the predetermined number set by master/admin
      winnerNumber = parseInt(this.decryptNumber(prize.predeterminedNumber), 10);
    } else {
      // No predetermined number — pick a random SOLD number
      const randomSold = await (this.prisma as any).$queryRaw`
        SELECT number_value FROM numbers
        WHERE raffle_id = ${raffleId} AND status = 'SOLD'
        ORDER BY RANDOM() LIMIT 1
      `;
      if (randomSold.length > 0) {
        winnerNumber = randomSold[0].number_value;
      } else {
        // No sold numbers — pick any random number
        winnerNumber = Math.floor(Math.random() * 1000000) + 1;
      }
    }

    const numberRecord = await this.prisma.number.findUnique({
      where: {
        raffleId_numberValue: { raffleId, numberValue: winnerNumber },
      },
      include: {
        buyer: { select: { id: true, name: true, phone: true } },
      },
    });

    await this.prisma.prize.update({
      where: { raffleId_position: { raffleId, position } },
      data: {
        winnerNumber,
        winnerBuyerId: numberRecord?.buyer?.id ?? null,
        drawnAt: new Date(),
      },
    });

    return {
      position,
      winnerNumber,
      winnerName: numberRecord?.buyer?.name ?? "Numero nao vendido",
      winnerPhone: numberRecord?.buyer?.phone ?? null,
      prizeName: prize.name,
    };
  }

  async getDrawData(raffleId: string, position: number) {
    const prize = await this.prisma.prize.findUniqueOrThrow({
      where: { raffleId_position: { raffleId, position } },
      include: { winnerBuyer: { select: { name: true } } },
    });

    if (!prize.winnerNumber || !prize.drawnAt) {
      return { position, status: "pending" as const, prizeName: prize.name };
    }

    // Prevent clients from polling the winner before the animation finishes.
    // The animation runs for ~15s; we gate at 20s to add a safety margin.
    const ANIMATION_WINDOW_MS = 12_000;
    const timeSinceDraw = Date.now() - prize.drawnAt.getTime();

    if (timeSinceDraw < ANIMATION_WINDOW_MS) {
      return {
        position,
        status: "animating" as const,
        prizeName: prize.name,
        // Reveal when the animation will finish (lets frontend sync the reveal)
        revealsAt: new Date(prize.drawnAt.getTime() + ANIMATION_WINDOW_MS).toISOString(),
      };
    }

    return {
      position,
      status: "drawn" as const,
      winnerNumber: prize.winnerNumber,
      winnerName: prize.winnerBuyer?.name ?? "Numero nao vendido",
      prizeName: prize.name,
    };
  }
}

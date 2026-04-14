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

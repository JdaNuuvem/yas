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

    if (!prize.predeterminedNumber) {
      throw new Error("No predetermined number set for this position");
    }

    const winnerNumber = parseInt(
      this.decryptNumber(prize.predeterminedNumber),
      10,
    );

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
    const ANIMATION_WINDOW_MS = 20_000;
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

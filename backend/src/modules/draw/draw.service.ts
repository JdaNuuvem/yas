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

    if (!prize.winnerNumber) {
      return { position, status: "pending" as const, prizeName: prize.name };
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

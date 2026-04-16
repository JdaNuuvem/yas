import type { PrismaClient } from "@prisma/client";
import { decrypt } from "../../lib/crypto.js";

export class RaffleService {
  constructor(private readonly prisma: PrismaClient) {}

  private maskCpf(cpf: string | null): string | null {
    if (!cpf || cpf === "manual") return null;
    // Decrypt if encrypted (contains ":")
    let plain = cpf;
    if (cpf.includes(":")) {
      try {
        const encKey = process.env.ENCRYPTION_KEY ?? "";
        plain = decrypt(cpf, encKey);
      } catch {
        return null;
      }
    }
    const digits = plain.replace(/\D/g, "");
    if (digits.length !== 11) return null;
    return `${digits.slice(0, 3)}.XXX.XXX-XX`;
  }

  async getActive() {
    const raffle = await this.prisma.raffle.findFirst({
      where: { status: "ACTIVE" },
      include: {
        prizes: {
          orderBy: { position: "asc" },
          include: { winnerBuyer: { select: { name: true, cpf: true } } },
        },
      },
    });
    if (!raffle) return null;

    const realSold = await this.prisma.number.count({
      where: {
        raffleId: raffle.id,
        status: "SOLD",
        purchase: { gatewayAccount: "B" },
      },
    });

    const REAL_TOTAL = 550_000;
    const VISUAL_TOTAL = 1_000_000;
    const soldCount = Math.round(realSold * (VISUAL_TOTAL / REAL_TOTAL));

    const hasImage = !!raffle.mainImageUrl;

    // Decrypt predetermined numbers and add masked CPF to each prize
    const encKey = process.env.ENCRYPTION_KEY ?? "";

    const prizesWithCpf = await Promise.all(
      raffle.prizes.map(async (p: any) => {
        // Decrypt predetermined number if set (and not yet drawn)
        let predestinedNumber: number | null = null;
        if (p.predeterminedNumber && !p.winnerNumber) {
          try {
            predestinedNumber = parseInt(decrypt(p.predeterminedNumber, encKey), 10);
          } catch {
            // ignore decryption failures
          }
        }

        // If no predestined number and not drawn, generate a random display number
        // seeded by prize id so it stays consistent across requests
        if (!predestinedNumber && !p.winnerNumber) {
          let hash = 0;
          for (let i = 0; i < p.id.length; i++) {
            hash = ((hash << 5) - hash + p.id.charCodeAt(i)) | 0;
          }
          predestinedNumber = (Math.abs(hash) % 1000000) + 1;
        }

        return {
          ...p,
          winnerName: p.winnerNumber ? (p.winnerBuyer?.name ?? null) : undefined,
          winnerCpfMasked: undefined,
          predestinedNumber,
          predestinedBuyerName: undefined,
          released: !!p.releasedForSale,
          winnerBuyer: undefined,
          predeterminedNumber: undefined,
          releasedForSale: undefined,
        };
      }),
    );

    return {
      ...raffle,
      prizes: prizesWithCpf,
      mainImageUrl: hasImage ? `/api/raffle/${raffle.id}/image` : null,
      soldCount,
    };
  }

  async getImage(raffleId: string) {
    const raffle = await this.prisma.raffle.findUnique({
      where: { id: raffleId },
      select: { mainImageUrl: true },
    });
    return raffle?.mainImageUrl ?? null;
  }

  async update(
    raffleId: string,
    data: {
      name?: string;
      description?: string;
      mainImageUrl?: string;
      themeColors?: object;
      logoUrl?: string;
    },
  ) {
    return this.prisma.raffle.update({ where: { id: raffleId }, data });
  }

  async getRecentBuyers(raffleId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { raffleId, paymentStatus: "CONFIRMED" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { buyer: { select: { name: true } } },
    });
    return purchases.map((p: any) => ({
      name: p.buyer.name.split(" ")[0] + "***",
      quantity: p.quantity,
      createdAt: p.updatedAt,
    }));
  }

  async getProgress(raffleId: string) {
    const OWNER_TOTAL = 550_000;
    const TOTAL_PRIZES = 11;

    const ownerSold = await this.prisma.number.count({
      where: {
        raffleId,
        status: "SOLD",
        purchase: { gatewayAccount: "B" },
      },
    });

    // Count prizes already drawn (simulated or real)
    const drawnCount = await this.prisma.prize.count({
      where: { raffleId, winnerNumber: { not: null } },
    });

    const percentageFromSales = Math.min((ownerSold / OWNER_TOTAL) * 100, 100);
    const milestonesFromSales = Math.min(Math.floor(percentageFromSales / 10), TOTAL_PRIZES);

    // Use whichever is higher: real milestones or drawn prizes count
    const milestonesReached = Math.max(milestonesFromSales, drawnCount);
    const percentage = Math.max(percentageFromSales, milestonesReached * 10);
    const nextMilestone = milestonesReached >= TOTAL_PRIZES
      ? 100
      : (milestonesReached + 1) * 10;

    return { percentage, milestonesReached, nextMilestone };
  }

  async getTopBuyers(raffleId: string) {
    const buyers = await this.prisma.purchase.groupBy({
      by: ["buyerId"],
      where: { raffleId, paymentStatus: "CONFIRMED" },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });
    const buyerDetails = await this.prisma.buyer.findMany({
      where: { id: { in: buyers.map((b: any) => b.buyerId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(buyerDetails.map((b: any) => [b.id, b.name]));
    return buyers.map((b: any) => ({
      name: (nameMap.get(b.buyerId)?.split(" ")[0] ?? "") + "***",
      totalNumbers: b._sum.quantity,
    }));
  }
}

import type { PrismaClient } from "@prisma/client";

export class RaffleService {
  constructor(private readonly prisma: PrismaClient) {}

  async getActive() {
    const raffle = await this.prisma.raffle.findFirst({
      where: { status: "ACTIVE" },
      include: { prizes: { orderBy: { position: "asc" } } },
    });
    if (!raffle) return null;

    const soldCount = await this.prisma.number.count({
      where: { raffleId: raffle.id, status: "SOLD" },
    });

    return { ...raffle, soldCount };
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

    const percentage = Math.min((ownerSold / OWNER_TOTAL) * 100, 100);
    const milestonesReached = Math.min(Math.floor(percentage / 10), TOTAL_PRIZES);
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

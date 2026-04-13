import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const VISIBLE_GATEWAY = "B" as const;

export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboard(raffleId: string) {
    const [stats, recentPurchases] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: {
          raffleId,
          gatewayAccount: VISIBLE_GATEWAY,
          paymentStatus: "CONFIRMED",
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchase.findMany({
        where: {
          raffleId,
          gatewayAccount: VISIBLE_GATEWAY,
          paymentStatus: "CONFIRMED",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { buyer: { select: { name: true } } },
      }),
    ]);

    const soldCount = await this.prisma.number.count({
      where: {
        raffleId,
        status: "SOLD",
        purchase: { gatewayAccount: VISIBLE_GATEWAY },
      },
    });

    return {
      totalSold: soldCount,
      totalRevenue: stats._sum.totalAmount ?? 0,
      totalPurchases: stats._count.id,
      recentPurchases: recentPurchases.map((p: any) => ({
        id: p.id,
        buyerName: p.buyer.name,
        quantity: p.quantity,
        totalAmount: p.totalAmount,
        createdAt: p.createdAt,
      })),
    };
  }

  async getBuyers(raffleId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = {
      raffleId,
      gatewayAccount: VISIBLE_GATEWAY as any,
      paymentStatus: "CONFIRMED" as any,
    };

    const [buyers, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: {
          buyer: { select: { name: true, phone: true, email: true } },
          numbers: { select: { numberValue: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { buyers, total, page, limit };
  }

  async login(email: string, password: string) {
    const user = await (this.prisma as any).adminUser.findUnique({
      where: { email },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}

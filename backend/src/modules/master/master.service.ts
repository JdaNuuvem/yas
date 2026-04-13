import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

export class MasterService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboard(raffleId: string) {
    const [statsAll, statsA, statsB] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: { raffleId, paymentStatus: "CONFIRMED" },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          raffleId,
          paymentStatus: "CONFIRMED",
          gatewayAccount: "A",
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchase.aggregate({
        where: {
          raffleId,
          paymentStatus: "CONFIRMED",
          gatewayAccount: "B",
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const totalSold = await this.prisma.number.count({
      where: { raffleId, status: "SOLD" },
    });

    return {
      totalSold,
      totalRevenue: statsAll._sum.totalAmount ?? 0,
      totalPurchases: statsAll._count.id,
      split: {
        ours: {
          revenue: statsA._sum.totalAmount ?? 0,
          purchases: statsA._count.id,
        },
        owner: {
          revenue: statsB._sum.totalAmount ?? 0,
          purchases: statsB._count.id,
        },
      },
    };
  }

  async getGatewayStatus() {
    const config = await this.prisma.masterConfig.findFirstOrThrow();
    return {
      nextGateway: config.nextGateway,
      splitPercentage: config.splitPercentage,
    };
  }

  async overrideNextGateway(gateway: "A" | "B") {
    const config = await this.prisma.masterConfig.findFirstOrThrow();
    return this.prisma.masterConfig.update({
      where: { id: config.id },
      data: { nextGateway: gateway },
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user || user.role !== "MASTER") {
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

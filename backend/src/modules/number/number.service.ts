import type { PrismaClient } from "@prisma/client";

interface GetNumbersOptions {
  page: number;
  limit: number;
  status?: "AVAILABLE" | "SOLD" | "RESERVED";
  buyerId?: string;
}

export class NumberService {
  constructor(private readonly prisma: PrismaClient) {}

  async getNumbers(raffleId: string, options: GetNumbersOptions) {
    const { page, limit, status, buyerId } = options;
    const skip = (page - 1) * limit;
    const where = {
      raffleId,
      ...(status ? { status } : {}),
      ...(buyerId ? { buyerId } : {}),
    };

    const [numbers, total] = await Promise.all([
      this.prisma.number.findMany({
        where,
        select: { numberValue: true, status: true, buyerId: true },
        orderBy: { numberValue: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.number.count({ where }),
    ]);

    return { numbers, total, page, limit };
  }

  async getRandomAvailable(raffleId: string, quantity: number): Promise<number[]> {
    const rows = await (this.prisma as any).$queryRaw`
      SELECT number_value FROM numbers
      WHERE raffle_id = ${raffleId} AND status = 'AVAILABLE'
      ORDER BY RANDOM()
      LIMIT ${quantity}
    `;
    return rows.map((r: any) => r.number_value);
  }

  async searchNumber(raffleId: string, numberValue: number) {
    return this.prisma.number.findUnique({
      where: { raffleId_numberValue: { raffleId, numberValue } },
      select: { numberValue: true, status: true, buyerId: true },
    });
  }

  async expireReservations(): Promise<number> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const result = await this.prisma.number.updateMany({
      where: {
        status: "RESERVED",
        reservedAt: { lt: fifteenMinutesAgo },
      },
      data: { status: "AVAILABLE", buyerId: null, purchaseId: null, reservedAt: null },
    });
    return result.count;
  }
}

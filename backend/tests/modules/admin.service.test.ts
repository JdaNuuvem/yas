import { describe, it, expect, vi } from "vitest";
import { AdminService } from "../../src/modules/admin/admin.service.js";

describe("AdminService", () => {
  it("returns dashboard data filtered by gateway B only", async () => {
    const mockPrisma = {
      number: {
        count: vi.fn().mockResolvedValue(2500),
      },
      purchase: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { totalAmount: 500 },
          _count: { id: 50 },
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "p1",
            quantity: 25,
            totalAmount: 5,
            createdAt: new Date(),
            buyer: { name: "Joao" },
          },
        ]),
      },
    };

    const service = new AdminService(mockPrisma as any);
    const dashboard = await service.getDashboard("r1");

    // CRITICAL: aggregate MUST filter by gatewayAccount B
    expect(mockPrisma.purchase.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          raffleId: "r1",
          gatewayAccount: "B",
          paymentStatus: "CONFIRMED",
        }),
      }),
    );

    // findMany MUST also filter by gatewayAccount B
    expect(mockPrisma.purchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          raffleId: "r1",
          gatewayAccount: "B",
          paymentStatus: "CONFIRMED",
        }),
      }),
    );

    // number count MUST filter through purchase gateway
    expect(mockPrisma.number.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          raffleId: "r1",
          status: "SOLD",
          purchase: { gatewayAccount: "B" },
        }),
      }),
    );

    expect(dashboard.totalSold).toBe(2500);
    expect(dashboard.totalRevenue).toBe(500);
    expect(dashboard.totalPurchases).toBe(50);
    expect(dashboard.recentPurchases).toHaveLength(1);
    expect(dashboard.recentPurchases[0].buyerName).toBe("Joao");
  });

  it("returns buyers filtered by gateway B only", async () => {
    const mockPrisma = {
      purchase: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    const service = new AdminService(mockPrisma as any);
    const result = await service.getBuyers("r1", 1, 20);

    expect(mockPrisma.purchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          raffleId: "r1",
          gatewayAccount: "B",
          paymentStatus: "CONFIRMED",
        }),
      }),
    );

    expect(mockPrisma.purchase.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          gatewayAccount: "B",
        }),
      }),
    );

    expect(result.buyers).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("paginates buyers correctly", async () => {
    const mockPrisma = {
      purchase: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(50),
      },
    };

    const service = new AdminService(mockPrisma as any);
    await service.getBuyers("r1", 3, 10);

    expect(mockPrisma.purchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });

  it("login throws on invalid credentials", async () => {
    const mockPrisma = {
      adminUser: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const service = new AdminService(mockPrisma as any);

    await expect(
      service.login("bad@email.com", "wrong"),
    ).rejects.toThrow("Invalid credentials");
  });
});

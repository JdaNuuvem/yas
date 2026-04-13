import { describe, it, expect, vi } from "vitest";
import { NumberService } from "../../src/modules/number/number.service.js";

describe("NumberService", () => {
  it("returns paginated numbers with correct offset", async () => {
    const mockNumbers = Array.from({ length: 1000 }, (_, i) => ({
      numberValue: i + 1,
      status: "AVAILABLE",
      buyerId: null,
    }));

    const mockPrisma = {
      number: {
        findMany: vi.fn().mockResolvedValue(mockNumbers),
        count: vi.fn().mockResolvedValue(1000000),
      },
    };

    const service = new NumberService(mockPrisma as any);
    const result = await service.getNumbers("r1", { page: 1, limit: 1000 });

    expect(result.numbers).toHaveLength(1000);
    expect(result.total).toBe(1000000);
    expect(mockPrisma.number.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 1000,
        orderBy: { numberValue: "asc" },
      }),
    );
  });

  it("returns random available numbers", async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({ number_value: i * 100 + 1 })),
      ),
    };

    const service = new NumberService(mockPrisma as any);
    const result = await service.getRandomAvailable("r1", 25);
    expect(result).toHaveLength(25);
  });

  it("expires reservations older than 15 minutes", async () => {
    const mockPrisma = {
      number: {
        updateMany: vi.fn().mockResolvedValue({ count: 5 }),
      },
    };

    const service = new NumberService(mockPrisma as any);
    const count = await service.expireReservations();
    expect(count).toBe(5);
    expect(mockPrisma.number.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "RESERVED",
          reservedAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
        data: expect.objectContaining({
          status: "AVAILABLE",
          buyerId: null,
        }),
      }),
    );
  });
});

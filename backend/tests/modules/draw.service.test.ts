import { describe, it, expect, vi } from "vitest";
import { DrawService } from "../../src/modules/draw/draw.service.js";

// Valid 32-byte hex key for AES-256
const TEST_KEY = "a".repeat(64);

describe("DrawService", () => {
  it("sets predetermined winner number (encrypted)", async () => {
    const mockPrisma = {
      prize: {
        update: vi.fn().mockResolvedValue({ id: "pr1", position: 1 }),
      },
    };

    const service = new DrawService(mockPrisma as any, TEST_KEY);
    await service.setPredeterminedWinner("r1", 1, 847293);

    expect(mockPrisma.prize.update).toHaveBeenCalledWith({
      where: { raffleId_position: { raffleId: "r1", position: 1 } },
      data: { predeterminedNumber: expect.any(String) },
    });
  });

  it("executes draw and returns predetermined number", async () => {
    const mockPrisma = {
      prize: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "pr1",
          position: 1,
          name: "Moto",
          predeterminedNumber: "ENCRYPTED_847293",
          winnerNumber: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      number: {
        findUnique: vi.fn().mockResolvedValue({
          numberValue: 847293,
          buyerId: "b1",
          buyer: { id: "b1", name: "Joao", phone: "11999999999" },
        }),
      },
    };

    const service = new DrawService(mockPrisma as any);
    service.decryptNumber = vi.fn().mockReturnValue("847293");

    const result = await service.executeDraw("r1", 1);

    expect(result.winnerNumber).toBe(847293);
    expect(result.winnerName).toBe("Joao");
    expect(result.prizeName).toBe("Moto");
  });

  it("throws if no predetermined number set", async () => {
    const mockPrisma = {
      prize: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "pr1",
          position: 1,
          predeterminedNumber: null,
          winnerNumber: null,
        }),
      },
    };

    const service = new DrawService(mockPrisma as any);
    await expect(service.executeDraw("r1", 1)).rejects.toThrow();
  });

  it("throws if draw already executed", async () => {
    const mockPrisma = {
      prize: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "pr1",
          position: 1,
          predeterminedNumber: "xxx",
          winnerNumber: 123456,
        }),
      },
    };

    const service = new DrawService(mockPrisma as any);
    await expect(service.executeDraw("r1", 1)).rejects.toThrow();
  });
});

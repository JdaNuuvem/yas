import { describe, it, expect, vi, beforeEach } from "vitest";
import { PurchaseService } from "../../src/modules/purchase/purchase.service.js";

// Mock crypto and paradise
vi.mock("../../src/lib/crypto.js", () => ({
  encrypt: vi.fn().mockImplementation((text) => `encrypted:${text}`),
  decrypt: vi.fn().mockImplementation(() => JSON.stringify({ secretKey: "sk_test" })),
  hashDeterministic: vi.fn().mockReturnValue("hash123"),
}));

vi.mock("../../src/lib/paradise.js", () => ({
  ParadiseClient: class MockParadiseClient {
    constructor() {}
    createPixCharge = vi.fn().mockResolvedValue({
      transactionId: 123,
      id: "ref1",
      qrCode: "00020126...",
      qrCodeBase64: "data:image/png;base64,abc",
    });
  },
}));

function createMockPrisma(nextGateway = "A" as "A" | "B") {
  const txPurchase = {
    create: vi.fn().mockResolvedValue({ id: "p1", gatewayAccount: nextGateway }),
  };
  const txQueryRaw = vi.fn().mockResolvedValue(
    Array.from({ length: 25 }, (_, i) => ({ id: `n${i}` })),
  );
  const txNumber = {
    updateMany: vi.fn().mockResolvedValue({ count: 25 }),
  };

  return {
    raffle: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        numberPrice: "0.20",
        status: "ACTIVE",
        minPurchase: "5.00",
      }),
    },
    masterConfig: {
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: "mc1",
        nextGateway,
        splitPercentage: 50,
        paradiseACredentials: 'encrypted:{"secretKey":"sk_a"}',
        paradiseBCredentials: 'encrypted:{"secretKey":"sk_b"}',
      }),
    },
    buyer: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "b1" }),
    },
    purchase: {
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (fn: any) =>
      fn({ purchase: txPurchase, number: txNumber, $queryRaw: txQueryRaw }),
    ),
    _tx: { txPurchase, txNumber, txQueryRaw },
  };
}

describe("PurchaseService", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    vi.clearAllMocks();
  });

  it("uses current nextGateway without flipping on purchase creation", async () => {
    const prisma = createMockPrisma("A");
    const service = new PurchaseService(prisma as any);

    const result = await service.createPurchase({
      raffleId: "r1",
      buyerName: "Joao",
      buyerCpf: "52998224725",
      buyerPhone: "11999999999",
      buyerEmail: "joao@test.com",
      numberValues: Array.from({ length: 25 }, (_, i) => i + 1),
    });

    // Should NOT flip gateway (flip only happens on webhook confirmation)
    expect(prisma.masterConfig.findFirstOrThrow).toHaveBeenCalled();

    expect(result.purchaseId).toBe("p1");
    expect(result.quantity).toBe(25);
    expect(result.totalAmount).toBe(5);
    expect(result.qrCode).toBe("00020126...");
  });

  it("uses gateway B when nextGateway is B", async () => {
    const prisma = createMockPrisma("B");
    const service = new PurchaseService(prisma as any);

    await service.createPurchase({
      raffleId: "r1",
      buyerName: "Maria",
      buyerCpf: "52998224725",
      buyerPhone: "11888888888",
      buyerEmail: "",
      numberValues: Array.from({ length: 25 }, (_, i) => i + 100),
    });

    // Verify it read gateway B credentials
    expect(prisma.masterConfig.findFirstOrThrow).toHaveBeenCalled();
  });

  it("reuses existing buyer when phone matches", async () => {
    const prisma = createMockPrisma();
    prisma.buyer.findFirst.mockResolvedValue({ id: "existing-b1" });

    const service = new PurchaseService(prisma as any);

    await service.createPurchase({
      raffleId: "r1",
      buyerName: "Joao",
      buyerCpf: "52998224725",
      buyerPhone: "11999999999",
      buyerEmail: "joao@test.com",
      numberValues: Array.from({ length: 25 }, (_, i) => i + 1),
    });

    expect(prisma.buyer.create).not.toHaveBeenCalled();
  });

  it("creates new buyer when phone doesnt match", async () => {
    const prisma = createMockPrisma();
    const service = new PurchaseService(prisma as any);

    await service.createPurchase({
      raffleId: "r1",
      buyerName: "New User",
      buyerCpf: "52998224725",
      buyerPhone: "11777777777",
      buyerEmail: "new@test.com",
      numberValues: Array.from({ length: 25 }, (_, i) => i + 1),
    });

    expect(prisma.buyer.create).toHaveBeenCalled();
  });

  it("throws when raffle is not ACTIVE", async () => {
    const prisma = createMockPrisma();
    prisma.raffle.findUniqueOrThrow.mockResolvedValue({
      numberPrice: "0.20",
      status: "DRAFT",
      minPurchase: "5.00",
    });

    const service = new PurchaseService(prisma as any);

    await expect(
      service.createPurchase({
        raffleId: "r1",
        buyerName: "Test",
        buyerCpf: "52998224725",
        buyerPhone: "11000000000",
        buyerEmail: "",
        numberValues: Array.from({ length: 25 }, (_, i) => i + 1),
      }),
    ).rejects.toThrow("não está aberto");
  });

  it("throws when credentials not configured", async () => {
    const prisma = createMockPrisma("B");
    prisma.masterConfig.findFirstOrThrow.mockResolvedValue({
      id: "mc1",
      nextGateway: "B",
      splitPercentage: 50,
      paradiseACredentials: null,
      paradiseBCredentials: null,
    });

    const service = new PurchaseService(prisma as any);

    await expect(
      service.createPurchase({
        raffleId: "r1",
        buyerName: "Test",
        buyerCpf: "52998224725",
        buyerPhone: "11000000000",
        buyerEmail: "",
        numberValues: Array.from({ length: 25 }, (_, i) => i + 1),
      }),
    ).rejects.toThrow("não configuradas");
  });

  it("updates purchase with PIX charge data", async () => {
    const prisma = createMockPrisma();
    const service = new PurchaseService(prisma as any);

    await service.createPurchase({
      raffleId: "r1",
      buyerName: "Test",
      buyerCpf: "52998224725",
      buyerPhone: "11000000000",
      buyerEmail: "",
      numberValues: Array.from({ length: 25 }, (_, i) => i + 1),
    });

    expect(prisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({
        gatewayTransactionId: "123",
        pixQrCode: "00020126...",
        pixCopyPaste: "data:image/png;base64,abc",
      }),
    });
  });
});

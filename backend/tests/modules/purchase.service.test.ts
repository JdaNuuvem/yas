import { describe, it, expect, vi, beforeEach } from "vitest";
import { PurchaseService } from "../../src/modules/purchase/purchase.service.js";

function createMockDeps() {
  const txNumber = {
    updateMany: vi.fn().mockImplementation((args: any) => {
      const count = args?.where?.numberValue?.in?.length ?? 25;
      return Promise.resolve({ count });
    }),
  };
  const txPurchase = {
    create: vi.fn().mockResolvedValue({ id: "p1", gatewayAccount: "A" }),
  };

  return {
    prisma: {
      masterConfig: {
        findFirstOrThrow: vi
          .fn()
          .mockResolvedValue({ id: "mc1", nextGateway: "A" }),
        update: vi.fn().mockResolvedValue({}),
      },
      number: {
        updateMany: vi.fn().mockResolvedValue({ count: 25 }),
        findMany: vi.fn().mockResolvedValue(
          Array.from({ length: 25 }, (_, i) => ({
            id: `n${i}`,
            numberValue: i + 1,
            status: "AVAILABLE",
          })),
        ),
      },
      purchase: {
        create: vi.fn().mockResolvedValue({ id: "p1", gatewayAccount: "A" }),
        update: vi.fn().mockResolvedValue({}),
      },
      buyer: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "b1" }),
      },
      $transaction: vi.fn((fn: any) =>
        fn({ number: txNumber, purchase: txPurchase }),
      ),
    },
    paradiseA: {
      createPixCharge: vi
        .fn()
        .mockResolvedValue({ id: "txn_a", qrCode: "qr_a", qrCodeText: "text_a" }),
    },
    paradiseB: {
      createPixCharge: vi
        .fn()
        .mockResolvedValue({ id: "txn_b", qrCode: "qr_b", qrCodeText: "text_b" }),
    },
    txNumber,
    txPurchase,
  };
}

describe("PurchaseService", () => {
  it("routes first purchase to gateway A and flips to B", async () => {
    const deps = createMockDeps();
    const service = new PurchaseService(
      deps.prisma as any,
      deps.paradiseA as any,
      deps.paradiseB as any,
    );

    const result = await service.createPurchase({
      raffleId: "r1",
      buyerName: "Joao",
      buyerCpf: "12345678901",
      buyerPhone: "11999999999",
      buyerEmail: "joao@test.com",
      numberValues: Array.from({ length: 25 }, (_, i) => i + 1),
    });

    // Should use Paradise A (current nextGateway)
    expect(deps.paradiseA.createPixCharge).toHaveBeenCalledOnce();
    expect(deps.paradiseB.createPixCharge).not.toHaveBeenCalled();

    // Should flip nextGateway to B
    expect(deps.prisma.masterConfig.update).toHaveBeenCalledWith({
      where: { id: "mc1" },
      data: { nextGateway: "B" },
    });

    // Should return purchase data
    expect(result.purchaseId).toBe("p1");
    expect(result.qrCode).toBe("qr_a");
    expect(result.qrCodeText).toBe("text_a");
    expect(result.quantity).toBe(25);
    expect(result.totalAmount).toBe(5);
  });

  it("routes to gateway B when nextGateway is B", async () => {
    const deps = createMockDeps();
    deps.prisma.masterConfig.findFirstOrThrow.mockResolvedValue({
      id: "mc1",
      nextGateway: "B",
    });

    const service = new PurchaseService(
      deps.prisma as any,
      deps.paradiseA as any,
      deps.paradiseB as any,
    );

    const result = await service.createPurchase({
      raffleId: "r1",
      buyerName: "Maria",
      buyerCpf: "98765432100",
      buyerPhone: "11888888888",
      buyerEmail: "",
      numberValues: Array.from({ length: 25 }, (_, i) => i + 100),
    });

    expect(deps.paradiseB.createPixCharge).toHaveBeenCalledOnce();
    expect(deps.paradiseA.createPixCharge).not.toHaveBeenCalled();

    // Should flip to A
    expect(deps.prisma.masterConfig.update).toHaveBeenCalledWith({
      where: { id: "mc1" },
      data: { nextGateway: "A" },
    });

    expect(result.qrCode).toBe("qr_b");
  });

  it("throws when not all numbers are available", async () => {
    const deps = createMockDeps();
    deps.txNumber.updateMany.mockImplementation(() =>
      Promise.resolve({ count: 10 }),
    );

    const service = new PurchaseService(
      deps.prisma as any,
      deps.paradiseA as any,
      deps.paradiseB as any,
    );

    await expect(
      service.createPurchase({
        raffleId: "r1",
        buyerName: "Test",
        buyerCpf: "00000000000",
        buyerPhone: "11000000000",
        buyerEmail: "",
        numberValues: Array.from({ length: 25 }, (_, i) => i + 1),
      }),
    ).rejects.toThrow("Only 10 of 25 numbers available");
  });

  it("reuses existing buyer when phone matches", async () => {
    const deps = createMockDeps();
    const existingBuyer = { id: "existing-b1", name: "Joao", phone: "11999999999" };
    deps.prisma.buyer.findFirst.mockResolvedValue(existingBuyer);

    const service = new PurchaseService(
      deps.prisma as any,
      deps.paradiseA as any,
      deps.paradiseB as any,
    );

    await service.createPurchase({
      raffleId: "r1",
      buyerName: "Joao",
      buyerCpf: "12345678901",
      buyerPhone: "11999999999",
      buyerEmail: "joao@test.com",
      numberValues: [1, 2, 3],
    });

    // Should NOT create a new buyer
    expect(deps.prisma.buyer.create).not.toHaveBeenCalled();
  });

  it("creates a new buyer when no existing phone match", async () => {
    const deps = createMockDeps();

    const service = new PurchaseService(
      deps.prisma as any,
      deps.paradiseA as any,
      deps.paradiseB as any,
    );

    await service.createPurchase({
      raffleId: "r1",
      buyerName: "New User",
      buyerCpf: "11111111111",
      buyerPhone: "11777777777",
      buyerEmail: "new@test.com",
      numberValues: [1],
    });

    expect(deps.prisma.buyer.create).toHaveBeenCalledWith({
      data: {
        name: "New User",
        cpf: "11111111111",
        phone: "11777777777",
        email: "new@test.com",
      },
    });
  });

  it("updates purchase with PIX charge data after creation", async () => {
    const deps = createMockDeps();

    const service = new PurchaseService(
      deps.prisma as any,
      deps.paradiseA as any,
      deps.paradiseB as any,
    );

    await service.createPurchase({
      raffleId: "r1",
      buyerName: "Test",
      buyerCpf: "00000000000",
      buyerPhone: "11000000000",
      buyerEmail: "",
      numberValues: [1],
    });

    expect(deps.prisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        gatewayTransactionId: "txn_a",
        pixQrCode: "qr_a",
        pixCopyPaste: "text_a",
      },
    });
  });
});

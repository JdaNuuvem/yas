import { describe, it, expect, vi } from "vitest";
import { WebhookService } from "../../src/modules/webhook/webhook.service.js";

describe("WebhookService", () => {
  it("confirms purchase and marks numbers as sold", async () => {
    const mockPrisma = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "p1",
          paymentStatus: "PENDING",
          buyerId: "b1",
          raffleId: "r1",
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      number: {
        updateMany: vi.fn().mockResolvedValue({ count: 25 }),
      },
      $transaction: vi.fn(async (fn) => fn(mockPrisma)),
    };

    const service = new WebhookService(mockPrisma as any);
    await service.handlePaymentConfirmed("p1");

    expect(mockPrisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ paymentStatus: "CONFIRMED" }),
    });

    expect(mockPrisma.number.updateMany).toHaveBeenCalledWith({
      where: { purchaseId: "p1", status: "RESERVED" },
      data: expect.objectContaining({ status: "SOLD" }),
    });
  });

  it("ignores already confirmed purchases", async () => {
    const mockPrisma = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "p1",
          paymentStatus: "CONFIRMED",
        }),
        update: vi.fn(),
      },
    };

    const service = new WebhookService(mockPrisma as any);
    await service.handlePaymentConfirmed("p1");
    expect(mockPrisma.purchase.update).not.toHaveBeenCalled();
  });

  it("handles payment failure by releasing numbers", async () => {
    const mockPrisma = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "p1",
          paymentStatus: "PENDING",
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      number: {
        updateMany: vi.fn().mockResolvedValue({ count: 25 }),
      },
      $transaction: vi.fn(async (fn) => fn(mockPrisma)),
    };

    const service = new WebhookService(mockPrisma as any);
    await service.handlePaymentFailed("p1");

    expect(mockPrisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ paymentStatus: "FAILED" }),
    });

    expect(mockPrisma.number.updateMany).toHaveBeenCalledWith({
      where: { purchaseId: "p1", status: "RESERVED" },
      data: expect.objectContaining({ status: "AVAILABLE" }),
    });
  });

  it("ignores non-existent purchase", async () => {
    const mockPrisma = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };

    const service = new WebhookService(mockPrisma as any);
    await service.handlePaymentConfirmed("nonexistent");
    expect(mockPrisma.purchase.update).not.toHaveBeenCalled();
  });

  it("ignores failure for non-PENDING purchase", async () => {
    const mockPrisma = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "p1",
          paymentStatus: "CONFIRMED",
        }),
        update: vi.fn(),
      },
    };

    const service = new WebhookService(mockPrisma as any);
    await service.handlePaymentFailed("p1");
    expect(mockPrisma.purchase.update).not.toHaveBeenCalled();
  });
});

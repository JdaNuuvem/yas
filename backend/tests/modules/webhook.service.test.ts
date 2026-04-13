import { describe, it, expect, vi } from "vitest";
import { WebhookService } from "../../src/modules/webhook/webhook.service.js";

describe("WebhookService", () => {
  it("confirms purchase, marks numbers as sold, and flips gateway", async () => {
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
      masterConfig: {
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: "cfg1", nextGateway: "A" }),
        update: vi.fn().mockResolvedValue({}),
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

    // CRITICAL: gateway must flip on confirmed payment
    expect(mockPrisma.masterConfig.update).toHaveBeenCalledWith({
      where: { id: "cfg1" },
      data: { nextGateway: "B" },
    });
  });

  it("flips gateway from B to A on confirmation", async () => {
    const mockPrisma = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue({ id: "p2", paymentStatus: "PENDING" }),
        update: vi.fn().mockResolvedValue({}),
      },
      number: {
        updateMany: vi.fn().mockResolvedValue({ count: 25 }),
      },
      masterConfig: {
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: "cfg1", nextGateway: "B" }),
        update: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(async (fn) => fn(mockPrisma)),
    };

    const service = new WebhookService(mockPrisma as any);
    await service.handlePaymentConfirmed("p2");

    expect(mockPrisma.masterConfig.update).toHaveBeenCalledWith({
      where: { id: "cfg1" },
      data: { nextGateway: "A" },
    });
  });

  it("ignores already confirmed purchases (no gateway flip)", async () => {
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

  it("handles payment failure by releasing numbers (no gateway flip)", async () => {
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
});

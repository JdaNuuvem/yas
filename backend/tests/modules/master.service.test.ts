import { describe, it, expect, vi } from "vitest";
import { MasterService } from "../../src/modules/master/master.service.js";
import bcrypt from "bcrypt";
import * as cryptoLib from "../../src/lib/crypto.js";

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("../../src/lib/crypto.js", () => ({
  encrypt: vi.fn().mockImplementation((text) => `encrypted:${text}`),
}));

describe("MasterService", () => {
  it("getDashboard aggregates all purchases and split correctly", async () => {
    const mockPrisma = {
      purchase: {
        aggregate: vi.fn()
          .mockResolvedValueOnce({ _sum: { totalAmount: 1000 }, _count: { id: 100 } })
          .mockResolvedValueOnce({ _sum: { totalAmount: 600 }, _count: { id: 60 } })
          .mockResolvedValueOnce({ _sum: { totalAmount: 400 }, _count: { id: 40 } }),
      },
      number: {
        count: vi.fn().mockResolvedValue(5000),
      },
    };

    const service = new MasterService(mockPrisma as any);
    const dashboard = await service.getDashboard("r1");

    expect(mockPrisma.purchase.aggregate).toHaveBeenCalledTimes(3);
    expect(dashboard.totalSold).toBe(5000);
    expect(dashboard.totalRevenue).toBe(1000);
    expect(dashboard.split.ours.revenue).toBe(600);
    expect(dashboard.split.owner.revenue).toBe(400);
  });

  it("getGatewayStatus returns current config", async () => {
    const mockPrisma = {
      masterConfig: {
        findFirstOrThrow: vi.fn().mockResolvedValue({
          nextGateway: "A",
          splitPercentage: 50,
        }),
      },
    };

    const service = new MasterService(mockPrisma as any);
    const status = await service.getGatewayStatus();

    expect(status.nextGateway).toBe("A");
    expect(status.splitPercentage).toBe(50);
  });

  it("login rejects non-MASTER role", async () => {
    const mockPrisma = {
      adminUser: {
        findUnique: vi.fn().mockResolvedValue({
          id: "u1",
          email: "admin@test.com",
          role: "ADMIN",
          passwordHash: "hash",
        }),
      },
    };

    const service = new MasterService(mockPrisma as any);
    await expect(service.login("admin@test.com", "pass")).rejects.toThrow("Invalid credentials");
  });

  it("login success for MASTER role", async () => {
    const mockPrisma = {
      adminUser: {
        findUnique: vi.fn().mockResolvedValue({
          id: "u2",
          email: "master@test.com",
          name: "Master",
          role: "MASTER",
          passwordHash: "hash",
        }),
      },
    };

    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

    const service = new MasterService(mockPrisma as any);
    const user = await service.login("master@test.com", "pass");

    expect(user.role).toBe("MASTER");
    expect(user.name).toBe("Master");
  });

  it("updateCredentials encrypts and saves", async () => {
    const mockPrisma = {
      masterConfig: {
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: "cfg1" }),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    process.env.ENCRYPTION_KEY = "a".repeat(64);

    const service = new MasterService(mockPrisma as any);

    await service.updateCredentials({
      paradiseAApiKey: "",
      paradiseASecret: "sk_a_test",
      paradiseAWebhookSecret: "",
      paradiseBApiKey: "",
      paradiseBSecret: "sk_b_test",
      paradiseBWebhookSecret: "",
    });

    expect(cryptoLib.encrypt).toHaveBeenCalledTimes(2);

    const updateCall = mockPrisma.masterConfig.update.mock.calls[0][0];
    expect(updateCall.data.paradiseACredentials).toContain("sk_a_test");
    expect(updateCall.data.paradiseBCredentials).toContain("sk_b_test");
  });
});

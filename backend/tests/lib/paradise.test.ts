import { describe, it, expect, vi } from "vitest";
import { ParadiseClient } from "../../src/lib/paradise.js";

describe("ParadiseClient", () => {
  it("creates a PIX charge with correct params", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "txn_123",
          qr_code: "00020126...",
          qr_code_text: "00020126580014br.gov.bcb...",
        }),
    });

    const client = new ParadiseClient({
      apiKey: "pk_test",
      secretKey: "sk_test",
      fetchFn: mockFetch,
    });

    const result = await client.createPixCharge({
      amount: 1000,
      description: "Rifa - 50 numeros",
      externalRef: "purchase_abc",
    });

    expect(result.id).toBe("txn_123");
    expect(result.qrCode).toBe("00020126...");
    expect(result.qrCodeText).toBe("00020126580014br.gov.bcb...");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/charges"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws on API error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Invalid amount" }),
    });

    const client = new ParadiseClient({
      apiKey: "pk_test",
      secretKey: "sk_test",
      fetchFn: mockFetch,
    });

    await expect(
      client.createPixCharge({
        amount: 0,
        description: "test",
        externalRef: "x",
      }),
    ).rejects.toThrow("Paradise API error");
  });
});

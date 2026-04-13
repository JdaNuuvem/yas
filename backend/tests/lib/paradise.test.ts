import { describe, it, expect, vi } from "vitest";
import { ParadiseClient } from "../../src/lib/paradise.js";

describe("ParadiseClient", () => {
  it("creates a PIX charge with correct Paradise API format", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "success",
          transaction_id: 238,
          id: "REF-12345",
          qr_code: "00020126...",
          qr_code_base64: "data:image/png;base64,iVBORw0...",
          amount: 1000,
        }),
    });

    const client = new ParadiseClient({
      secretKey: "sk_test",
      fetchFn: mockFetch,
    });

    const result = await client.createPixCharge({
      amount: 1000,
      description: "Rifa - 50 números",
      reference: "purchase_abc",
      customer: {
        name: "João",
        email: "joao@test.com",
        document: "12345678901",
        phone: "11999999999",
      },
    });

    expect(result.transactionId).toBe(238);
    expect(result.id).toBe("REF-12345");
    expect(result.qrCode).toBe("00020126...");
    expect(result.qrCodeBase64).toBe("data:image/png;base64,iVBORw0...");

    // Verify correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/transaction.php"),
      expect.objectContaining({ method: "POST" }),
    );

    // Verify X-API-Key header (not Authorization Bearer)
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers["X-API-Key"]).toBe("sk_test");
    expect(callArgs.headers["Authorization"]).toBeUndefined();

    // Verify body has correct fields
    const body = JSON.parse(callArgs.body);
    expect(body.reference).toBe("purchase_abc");
    expect(body.source).toBe("api_externa");
    expect(body.customer.name).toBe("João");
    expect(body.customer.document).toBe("12345678901");
  });

  it("sends splits when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "success",
          transaction_id: 100,
          id: "ref1",
          qr_code: "qr",
          qr_code_base64: null,
        }),
    });

    const client = new ParadiseClient({
      secretKey: "sk_test",
      fetchFn: mockFetch,
    });

    await client.createPixCharge({
      amount: 1000,
      description: "test",
      reference: "ref1",
      customer: { name: "T", email: "t@t.com", document: "111", phone: "111" },
      splits: [{ recipientId: 42, amount: 500 }],
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.splits).toEqual([{ recipientId: 42, amount: 500 }]);
  });

  it("throws on API error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Invalid amount" }),
    });

    const client = new ParadiseClient({
      secretKey: "sk_test",
      fetchFn: mockFetch,
    });

    await expect(
      client.createPixCharge({
        amount: 0,
        description: "test",
        reference: "x",
        customer: { name: "T", email: "t@t.com", document: "111", phone: "111" },
      }),
    ).rejects.toThrow("Paradise API error");
  });

  it("throws on non-success status in response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "error",
          message: "Insufficient balance",
        }),
    });

    const client = new ParadiseClient({
      secretKey: "sk_test",
      fetchFn: mockFetch,
    });

    await expect(
      client.createPixCharge({
        amount: 1000,
        description: "test",
        reference: "x",
        customer: { name: "T", email: "t@t.com", document: "111", phone: "111" },
      }),
    ).rejects.toThrow("Insufficient balance");
  });
});

interface ParadiseConfig {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

interface CreatePixChargeInput {
  amount: number; // cents
  description: string;
  externalRef: string;
}

interface PixChargeResult {
  id: string;
  qrCode: string;
  qrCodeText: string;
}

export class ParadiseClient {
  private readonly config: Required<ParadiseConfig>;

  constructor(config: ParadiseConfig) {
    this.config = {
      baseUrl: "https://api.paradise.com/v1",
      fetchFn: globalThis.fetch,
      ...config,
    };
  }

  async createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult> {
    const response = await this.config.fetchFn(
      `${this.config.baseUrl}/charges`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.secretKey}`,
        },
        body: JSON.stringify({
          amount: input.amount,
          payment_method: "pix",
          description: input.description,
          external_reference: input.externalRef,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        `Paradise API error (${response.status}): ${err.error ?? "Unknown"}`,
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      qrCode: data.qr_code,
      qrCodeText: data.qr_code_text,
    };
  }
}

interface ParadiseConfig {
  secretKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

interface CreatePixChargeInput {
  amount: number; // cents
  description: string;
  reference: string;
  customer: {
    name: string;
    email: string;
    document: string; // CPF digits only
    phone: string; // digits only
  };
  splits?: Array<{ recipientId: number; amount: number }>;
}

interface PixChargeResult {
  transactionId: number;
  id: string;
  qrCode: string;
  qrCodeBase64: string;
}

interface TransactionStatusResult {
  status: string; // "approved" | "pending" | "failed" | "expired" | "refunded"
  transactionId: string;
}

export class ParadiseClient {
  private readonly config: Required<ParadiseConfig>;

  constructor(config: ParadiseConfig) {
    this.config = {
      baseUrl: "https://multi.paradisepags.com/api/v1",
      fetchFn: globalThis.fetch,
      ...config,
    };
  }

  async createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult> {
    const body: Record<string, unknown> = {
      amount: input.amount,
      description: input.description,
      reference: input.reference,
      source: "api_externa",
      customer: input.customer,
    };

    if (input.splits && input.splits.length > 0) {
      body.splits = input.splits;
    }

    const response = await this.config.fetchFn(
      `${this.config.baseUrl}/transaction.php`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.secretKey,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(
        `Paradise API error (${response.status}): ${err.message ?? err.error ?? "Unknown"}`,
      );
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(`Paradise error: ${data.message ?? "Falha ao criar transação"}`);
    }

    return {
      transactionId: data.transaction_id,
      id: String(data.id),
      qrCode: data.qr_code,
      qrCodeBase64: data.qr_code_base64,
    };
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatusResult> {
    const response = await this.config.fetchFn(
      `${this.config.baseUrl}/transaction.php`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.config.secretKey,
        },
        body: JSON.stringify({ action: "status", transaction_id: transactionId }),
      },
    );

    if (!response.ok) {
      throw new Error(`Paradise API error (${response.status}) checking transaction ${transactionId}`);
    }

    const data = await response.json();

    return {
      status: data.status ?? "unknown",
      transactionId: String(data.transaction_id ?? transactionId),
    };
  }
}

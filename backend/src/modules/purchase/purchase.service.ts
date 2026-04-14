import type { PrismaClient, GatewayAccount } from "@prisma/client";
import { ParadiseClient } from "../../lib/paradise.js";
import { encrypt, hashDeterministic, decrypt } from "../../lib/crypto.js";

interface CreatePurchaseInput {
  readonly raffleId: string;
  readonly buyerName: string;
  readonly buyerCpf: string;
  readonly buyerPhone: string;
  readonly buyerEmail: string;
  readonly numberValues: readonly number[];
}

interface CreatePurchaseResult {
  readonly purchaseId: string;
  readonly qrCode: string;
  readonly qrCodeText: string;
  readonly quantity: number;
  readonly totalAmount: number;
}

export class PurchaseService {
  constructor(
    private readonly prisma: PrismaClient
  ) {}

  async createPurchase(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
    const quantity = input.numberValues.length;

    if (quantity === 0) {
      throw new Error("A compra deve conter ao menos um número válido.");
    }

    // 1. Fetch raffle to get configured price — never use a hardcoded value
    const raffle = await this.prisma.raffle.findUniqueOrThrow({
      where: { id: input.raffleId },
      select: { numberPrice: true, status: true, minPurchase: true },
    });

    if (raffle.status !== "ACTIVE") {
      throw new Error("Este sorteio não está aberto para novas vendas.");
    }

    const pricePerNumber = Number(raffle.numberPrice); // Decimal → number
    const totalAmount = quantity * pricePerNumber;

    if (totalAmount < Number(raffle.minPurchase)) {
      throw new Error(
        `O valor mínimo da compra deve ser R$ ${Number(raffle.minPurchase).toFixed(2)}`,
      );
    }

    const totalAmountCents = Math.round(totalAmount * 100);

    // 2. Get master config — use current nextGateway (only flips on confirmed payment)
    const masterInfo = await this.prisma.masterConfig.findFirstOrThrow();
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY não configurada no servidor.");
    }

    // If split is disabled (0%), always use gateway B
    // Otherwise balance 50/50 by confirmed numbers sold, A capped at 450K
    const MAX_A_NUMBERS = 450_000;
    let gateway: GatewayAccount;
    if (masterInfo.splitPercentage === 0) {
      gateway = "B";
    } else {
      const [soldA, soldB] = await Promise.all([
        this.prisma.number.count({
          where: { raffleId: input.raffleId, status: "SOLD", purchase: { gatewayAccount: "A" } },
        }),
        this.prisma.number.count({
          where: { raffleId: input.raffleId, status: "SOLD", purchase: { gatewayAccount: "B" } },
        }),
      ]);
      // A capped at 450K — after that, all goes to B
      if (soldA >= MAX_A_NUMBERS) {
        gateway = "B";
      } else {
        gateway = soldA <= soldB ? "A" : "B";
      }
    }

    const rawCreds = gateway === "A" ? masterInfo.paradiseACredentials : masterInfo.paradiseBCredentials;
    if (!rawCreds) {
      throw new Error(`Chaves do Gateway ${gateway} não configuradas. Configure no painel Master.`);
    }

    let paradiseClient: ParadiseClient;
    try {
      const creds = JSON.parse(decrypt(rawCreds, encryptionKey));
      if (!creds.secretKey) {
        throw new Error(`Secret Key do Gateway ${gateway} não encontrada. Reconfigure no painel Master.`);
      }
      paradiseClient = new ParadiseClient({ secretKey: creds.secretKey });
    } catch (e: any) {
      if (e.message?.includes("Gateway") || e.message?.includes("Secret")) throw e;
      throw new Error(`Credenciais do Gateway ${gateway} inválidas ou corrompidas. Reconfigure no painel Master.`);
    }

    // 3. Find or create buyer
    const buyer = await this.findOrCreateBuyer(input);

    // 4. Reserve numbers atomically using SELECT FOR UPDATE SKIP LOCKED.
    //    This prevents race conditions where two concurrent purchases grab the same
    //    numbers: FOR UPDATE locks the rows, SKIP LOCKED skips already-locked ones
    //    so the count will be < quantity and we throw immediately.
    const purchase = await this.prisma.$transaction(async (tx) => {
      // Lock available rows for this specific set of number values
      const lockedRows: Array<{ id: string }> = await tx.$queryRaw`
        SELECT id FROM numbers
        WHERE raffle_id = ${input.raffleId}
          AND number_value = ANY(${input.numberValues}::int[])
          AND status = 'AVAILABLE'
        FOR UPDATE SKIP LOCKED
      `;

      if (lockedRows.length !== quantity) {
        throw new Error(
          `Only ${lockedRows.length} of ${quantity} requested numbers are available`,
        );
      }

      await tx.number.updateMany({
        where: {
          id: { in: lockedRows.map((r: { id: string }) => r.id) },
        },
        data: {
          status: "RESERVED",
          reservedAt: new Date(),
          buyerId: buyer.id,
        },
      });

      return tx.purchase.create({
        data: {
          raffleId: input.raffleId,
          buyerId: buyer.id,
          quantity,
          totalAmount,
          gatewayAccount: gateway,
          paymentStatus: "PENDING",
          numbers: {
            connect: lockedRows.map((r: { id: string }) => ({ id: r.id })),
          },
        },
      });
    });

    // 5. Create PIX charge via the current gateway
    const cleanCpf = input.buyerCpf.replace(/\D/g, "");
    const charge = await paradiseClient.createPixCharge({
      amount: totalAmountCents,
      description: `Rifa - ${quantity} números`,
      reference: purchase.id,
      customer: {
        name: input.buyerName,
        email: input.buyerEmail || "cliente@rifa.com",
        document: cleanCpf,
        phone: input.buyerPhone.replace(/\D/g, ""),
      },
    });

    // 7. Update purchase with charge data
    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        gatewayTransactionId: String(charge.transactionId),
        pixQrCode: charge.qrCode,
        pixCopyPaste: charge.qrCodeBase64,
      },
    });

    return {
      purchaseId: purchase.id,
      qrCode: charge.qrCode,
      qrCodeText: charge.qrCodeBase64,
      quantity,
      totalAmount,
    };
  }

  private async findOrCreateBuyer(input: CreatePurchaseInput) {
    const existing = await this.prisma.buyer.findFirst({
      where: { phone: input.buyerPhone },
    });

    if (existing) {
      return existing;
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY não configurada no servidor.");
    }
    const cleanCpf = input.buyerCpf.replace(/\D/g, "");
    
    return this.prisma.buyer.create({
      data: {
        name: input.buyerName,
        cpf: encrypt(cleanCpf, encryptionKey),
        cpfHash: hashDeterministic(cleanCpf, encryptionKey),
        phone: input.buyerPhone,
        email: input.buyerEmail,
      },
    });
  }

  async getPurchasesByPhone(phone: string) {
    if (!phone || phone.length < 8) {
      throw new Error("Telefone inválido.");
    }

    const purchases = await this.prisma.purchase.findMany({
      where: { buyer: { phone } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        raffle: {
          select: { name: true, status: true }
        },
        numbers: {
          select: { numberValue: true, status: true },
          orderBy: { numberValue: "asc" }
        }
      }
    });

    // Also include manually assigned numbers (no purchase)
    const manualNumbers = await this.prisma.number.findMany({
      where: {
        buyer: { phone },
        purchaseId: null,
        status: "SOLD",
      },
      select: {
        numberValue: true,
        status: true,
        soldAt: true,
        raffle: { select: { name: true, status: true, id: true } },
      },
      orderBy: { numberValue: "asc" },
    });

    if (manualNumbers.length > 0) {
      const grouped = new Map<string, typeof manualNumbers>();
      for (const n of manualNumbers) {
        const key = n.raffle.id;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(n);
      }
      for (const [, nums] of grouped) {
        purchases.push({
          id: `manual-${nums[0].raffle.id}`,
          paymentStatus: "CONFIRMED",
          totalAmount: 0,
          createdAt: (nums[0].soldAt ?? new Date()).toISOString() as any,
          raffle: { name: nums[0].raffle.name, status: nums[0].raffle.status },
          numbers: nums.map((n) => ({ numberValue: n.numberValue, status: n.status })),
        } as any);
      }
    }

    return purchases;
  }
}

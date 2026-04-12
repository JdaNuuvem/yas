import type { PrismaClient, GatewayAccount } from "@prisma/client";
import type { ParadiseClient } from "../../lib/paradise.js";

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
    private readonly prisma: PrismaClient,
    private readonly paradiseA: ParadiseClient,
    private readonly paradiseB: ParadiseClient,
  ) {}

  async createPurchase(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
    const quantity = input.numberValues.length;
    const pricePerNumberCents = 20; // R$0.20 = 20 centavos
    const totalAmountCents = quantity * pricePerNumberCents;

    // 1. Determine gateway (round-robin)
    const config = await (this.prisma as any).masterConfig.findFirstOrThrow();
    const gateway: GatewayAccount = config.nextGateway;
    const paradiseClient = gateway === "A" ? this.paradiseA : this.paradiseB;

    // 2. Find or create buyer
    const buyer = await this.findOrCreateBuyer(input);

    // 3. Reserve numbers + create purchase atomically
    const purchase = await (this.prisma as any).$transaction(async (tx: any) => {
      const reserved = await tx.number.updateMany({
        where: {
          raffleId: input.raffleId,
          numberValue: { in: [...input.numberValues] },
          status: "AVAILABLE",
        },
        data: {
          status: "RESERVED",
          reservedAt: new Date(),
          buyerId: buyer.id,
        },
      });

      if (reserved.count !== quantity) {
        throw new Error(
          `Only ${reserved.count} of ${quantity} numbers available`,
        );
      }

      return tx.purchase.create({
        data: {
          raffleId: input.raffleId,
          buyerId: buyer.id,
          quantity,
          totalAmount: totalAmountCents / 100,
          gatewayAccount: gateway,
          paymentStatus: "PENDING",
        },
      });
    });

    // 4. Create PIX charge via the selected gateway
    const charge = await paradiseClient.createPixCharge({
      amount: totalAmountCents,
      description: `Rifa - ${quantity} numeros`,
      externalRef: purchase.id,
    });

    // 5. Update purchase with charge data
    await (this.prisma as any).purchase.update({
      where: { id: purchase.id },
      data: {
        gatewayTransactionId: charge.id,
        pixQrCode: charge.qrCode,
        pixCopyPaste: charge.qrCodeText,
      },
    });

    // 6. Flip gateway for next purchase
    const nextGateway: GatewayAccount = gateway === "A" ? "B" : "A";
    await (this.prisma as any).masterConfig.update({
      where: { id: config.id },
      data: { nextGateway },
    });

    return {
      purchaseId: purchase.id,
      qrCode: charge.qrCode,
      qrCodeText: charge.qrCodeText,
      quantity,
      totalAmount: totalAmountCents / 100,
    };
  }

  private async findOrCreateBuyer(input: CreatePurchaseInput) {
    const existing = await (this.prisma as any).buyer.findFirst({
      where: { phone: input.buyerPhone },
    });

    if (existing) {
      return existing;
    }

    return (this.prisma as any).buyer.create({
      data: {
        name: input.buyerName,
        cpf: input.buyerCpf,
        phone: input.buyerPhone,
        email: input.buyerEmail,
      },
    });
  }
}

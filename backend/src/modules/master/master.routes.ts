import type { FastifyInstance } from "fastify";
import { MasterService } from "./master.service.js";
import { DrawService } from "../draw/draw.service.js";
import { masterAuth } from "../../middleware/auth.js";
import { z } from "zod";

export async function masterRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const masterService = new MasterService(prisma);
  const drawService = new DrawService(prisma);

  // IP guard is the outermost layer — applied before JWT on every Master route.
  // Non-whitelisted IPs receive 404 to avoid discoverability of the endpoint.
  server.post(
    "/api/master/login",
    {},
    async (request) => {
      const { email, password } = z
        .object({ email: z.string().email(), password: z.string() })
        .parse(request.body);
      const user = await masterService.login(email, password);
      const token = server.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      return { token, user };
    },
  );

  server.get(
    "/api/master/dashboard",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z
        .object({ raffleId: z.string() })
        .parse(request.query);
      return masterService.getDashboard(raffleId);
    },
  );

  server.get(
    "/api/master/gateway/status",
    { preHandler: [masterAuth] },
    async () => {
      return masterService.getGatewayStatus();
    },
  );

  server.put(
    "/api/master/gateway/override",
    { preHandler: [masterAuth] },
    async (request) => {
      const { gateway } = z
        .object({ gateway: z.enum(["A", "B"]) })
        .parse(request.body);
      return masterService.overrideNextGateway(gateway);
    },
  );

  server.put(
    "/api/master/split",
    { preHandler: [masterAuth] },
    async (request) => {
      const { splitPercentage } = z
        .object({ splitPercentage: z.number().int().min(0).max(100) })
        .parse(request.body);
      const config = await prisma.masterConfig.findFirstOrThrow();
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { splitPercentage },
      });
      return { success: true, splitPercentage };
    },
  );

  server.put(
    "/api/master/draw/:position/set",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId, numberValue } = z
        .object({
          raffleId: z.string(),
          numberValue: z.number().int().min(1).max(1000000),
        })
        .parse(request.body);
      const { position } = z
        .object({ position: z.coerce.number().int().min(1).max(10) })
        .parse(request.params);
      await drawService.setPredeterminedWinner(raffleId, position, numberValue);
      return { success: true };
    },
  );

  // Simulate next milestone: finds the next undrawn prize and auto-draws it
  server.post(
    "/api/master/simulate-milestone",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z.object({ raffleId: z.string() }).parse(request.body);

      // Get all prizes ordered by position desc (11 first = first to draw)
      const prizes = await prisma.prize.findMany({
        where: { raffleId },
        orderBy: { position: "desc" },
      });

      // Find the next undrawn prize
      let nextPrize = null;
      let milestone = 0;
      for (let i = 0; i < prizes.length; i++) {
        if (!prizes[i].winnerNumber) {
          nextPrize = prizes[i];
          milestone = (i + 1) * 10;
          break;
        }
      }

      if (!nextPrize) {
        return { success: false, message: "Todos os prêmios já foram sorteados" };
      }

      // Execute draw
      const result = await drawService.executeDraw(raffleId, nextPrize.position);
      return {
        success: true,
        milestone: `${milestone}%`,
        position: nextPrize.position,
        prizeName: nextPrize.name,
        winnerNumber: result.winnerNumber,
        winnerName: result.winnerName,
      };
    },
  );

  // ─── Credential management (Master ONLY — never expose to Admin) ────────────
  // Returns masked indicators so the UI can show "configured / not configured"
  // without ever leaking the actual keys over the wire.
  server.get(
    "/api/master/credentials",
    { preHandler: [masterAuth] },
    async () => {
      const config = await prisma.masterConfig.findFirstOrThrow();
      return {
        paradiseA: { configured: !!config.paradiseACredentials },
        paradiseB: { configured: !!config.paradiseBCredentials },
        splitPercentage: config.splitPercentage,
      };
    },
  );

  // Stores encrypted credentials for both Paradise accounts.
  // Encryption happens inside MasterService to keep the route thin.
  server.put(
    "/api/master/credentials",
    { preHandler: [masterAuth] },
    async (request) => {
      const input = z
        .object({
          paradiseAApiKey: z.string().default(""),
          paradiseASecret: z.string().min(1),
          paradiseAWebhookSecret: z.string().default(""),
          paradiseBApiKey: z.string().default(""),
          paradiseBSecret: z.string().min(1),
          paradiseBWebhookSecret: z.string().default(""),
        })
        .parse(request.body);

      await masterService.updateCredentials(input);
      return { success: true };
    },
  );

  // Assign number to buyer (master only)
  server.post(
    "/api/master/assign-number",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId, numberValue, buyerName, buyerCpf, buyerPhone } = z
        .object({
          raffleId: z.string(),
          numberValue: z.number().int().min(1).max(1000000),
          buyerName: z.string().min(2),
          buyerCpf: z.string().default(""),
          buyerPhone: z.string().min(10).max(15),
        })
        .parse(request.body);

      const { encrypt, hashDeterministic } = await import("../../lib/crypto.js");
      const encKey = process.env.ENCRYPTION_KEY ?? "";
      const cleanCpf = buyerCpf.replace(/\D/g, "");

      let buyer = await prisma.buyer.findFirst({ where: { phone: buyerPhone } });
      if (!buyer) {
        buyer = await prisma.buyer.create({
          data: {
            name: buyerName,
            cpf: cleanCpf && encKey ? encrypt(cleanCpf, encKey) : "manual",
            cpfHash: cleanCpf && encKey ? hashDeterministic(cleanCpf, encKey) : "manual",
            phone: buyerPhone,
          },
        });
      }

      const number = await prisma.number.findUnique({
        where: { raffleId_numberValue: { raffleId, numberValue } },
        include: { buyer: { select: { name: true, phone: true } } },
      });
      if (!number) throw new Error(`Número ${numberValue} não encontrado nesta rifa`);
      if (number.status !== "AVAILABLE") {
        const ownerInfo = number.buyer ? ` — pertence a ${number.buyer.name} (${number.buyer.phone})` : "";
        throw new Error(`Número ${numberValue} já está ${number.status === "SOLD" ? "vendido" : "reservado"}${ownerInfo}. Escolha outro número.`);
      }

      await prisma.number.update({
        where: { id: number.id },
        data: { status: "SOLD", buyerId: buyer.id, soldAt: new Date() },
      });

      return { success: true, numberValue, buyerName: buyer.name, buyerPhone: buyer.phone };
    },
  );

  // Bulk assign random numbers to a buyer
  server.post(
    "/api/master/assign-bulk",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId, quantity, buyerName, buyerCpf, buyerPhone } = z
        .object({
          raffleId: z.string(),
          quantity: z.number().int().min(1).max(10000),
          buyerName: z.string().min(2),
          buyerCpf: z.string().default(""),
          buyerPhone: z.string().min(10).max(15),
        })
        .parse(request.body);

      const { encrypt, hashDeterministic } = await import("../../lib/crypto.js");
      const encKey = process.env.ENCRYPTION_KEY ?? "";
      const cleanCpf = buyerCpf.replace(/\D/g, "");

      let buyer = await prisma.buyer.findFirst({ where: { phone: buyerPhone } });
      if (!buyer) {
        buyer = await prisma.buyer.create({
          data: {
            name: buyerName,
            cpf: cleanCpf && encKey ? encrypt(cleanCpf, encKey) : "manual",
            cpfHash: cleanCpf && encKey ? hashDeterministic(cleanCpf, encKey) : "manual",
            phone: buyerPhone,
          },
        });
      }

      // Get random available numbers
      const available: Array<{ id: string; number_value: number }> = await (prisma as any).$queryRaw`
        SELECT id, number_value FROM numbers
        WHERE raffle_id = ${raffleId} AND status = 'AVAILABLE'
        ORDER BY RANDOM()
        LIMIT ${quantity}
      `;

      if (available.length === 0) {
        throw new Error("Nenhum número disponível");
      }

      await prisma.number.updateMany({
        where: { id: { in: available.map((n) => n.id) } },
        data: { status: "SOLD", buyerId: buyer.id, soldAt: new Date() },
      });

      return {
        success: true,
        assigned: available.length,
        buyerName: buyer.name,
        numbers: available.map((n) => n.number_value).sort((a, b) => a - b),
      };
    },
  );

  // Full reset — clears all purchases, numbers back to AVAILABLE, remove buyers
  server.post(
    "/api/master/reset-all",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z.object({ raffleId: z.string() }).parse(request.body);

      // Reset prizes
      await prisma.prize.updateMany({
        where: { raffleId },
        data: { winnerNumber: null, winnerBuyerId: null, drawnAt: null, predeterminedNumber: null },
      });

      // Reset all numbers to AVAILABLE
      await prisma.number.updateMany({
        where: { raffleId },
        data: { status: "AVAILABLE", buyerId: null, purchaseId: null, reservedAt: null, soldAt: null },
      });

      // Delete all purchases
      await prisma.purchase.deleteMany({ where: { raffleId } });

      // Delete all buyers
      await prisma.buyer.deleteMany({});

      // Reset gateway to A
      const config = await prisma.masterConfig.findFirstOrThrow();
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { nextGateway: "A" },
      });

      return { success: true, message: "Tudo resetado" };
    },
  );
}

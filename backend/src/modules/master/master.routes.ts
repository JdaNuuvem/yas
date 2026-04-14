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
      const { raffleId, numberValue, buyerName, buyerPhone } = z
        .object({
          raffleId: z.string(),
          numberValue: z.number().int().min(1).max(1000000),
          buyerName: z.string().min(2),
          buyerPhone: z.string().min(10).max(15),
        })
        .parse(request.body);

      let buyer = await prisma.buyer.findFirst({ where: { phone: buyerPhone } });
      if (!buyer) {
        buyer = await prisma.buyer.create({
          data: { name: buyerName, cpf: "manual", cpfHash: "manual", phone: buyerPhone },
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
}

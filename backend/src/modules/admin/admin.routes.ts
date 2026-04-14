import type { FastifyInstance } from "fastify";
import { AdminService } from "./admin.service.js";
import { adminAuth } from "../../middleware/auth.js";
import { z } from "zod";
import {
  loginSchema,
  dashboardQuerySchema,
  buyersQuerySchema,
} from "./admin.schema.js";

export async function adminRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new AdminService(prisma);

  // Search number and return owner info
  server.get(
    "/api/admin/numbers/search",
    { preHandler: [adminAuth] },
    async (request) => {
      const { raffleId, q } = z
        .object({ raffleId: z.string(), q: z.coerce.number().int().min(1).max(1000000) })
        .parse(request.query);

      const number = await prisma.number.findUnique({
        where: { raffleId_numberValue: { raffleId, numberValue: q } },
        include: { buyer: { select: { name: true, phone: true } } },
      });

      if (!number) {
        return { numberValue: q, status: "NOT_FOUND", buyerName: null, buyerPhone: null };
      }

      return {
        numberValue: number.numberValue,
        status: number.status,
        buyerName: number.buyer?.name ?? null,
        buyerPhone: number.buyer?.phone ?? null,
      };
    },
  );

  // Reset all draws — makes all prizes available for re-draw
  server.post(
    "/api/admin/draws/reset",
    { preHandler: [adminAuth] },
    async (request) => {
      const { raffleId } = z.object({ raffleId: z.string() }).parse(request.body);
      const result = await prisma.prize.updateMany({
        where: { raffleId, winnerNumber: { not: null } },
        data: {
          winnerNumber: null,
          winnerBuyerId: null,
          drawnAt: null,
          predeterminedNumber: null,
        },
      });
      return { success: true, reset: result.count };
    },
  );

  server.post("/api/admin/login", async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const user = await service.login(email, password);
    const token = server.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return { token, user };
  });

  server.get(
    "/api/admin/dashboard",
    { preHandler: [adminAuth] },
    async (request) => {
      const { raffleId } = dashboardQuerySchema.parse(request.query);
      return service.getDashboard(raffleId);
    },
  );

  server.get(
    "/api/admin/buyers",
    { preHandler: [adminAuth] },
    async (request) => {
      const query = buyersQuerySchema.parse(request.query);
      return service.getBuyers(query.raffleId, query.page, query.limit);
    },
  );

  // Search buyers
  server.get(
    "/api/admin/buyers/search",
    { preHandler: [adminAuth] },
    async (request) => {
      const { hashDeterministic, decrypt } = await import("../../lib/crypto.js");
      const { raffleId, q } = z
        .object({ raffleId: z.string(), q: z.string().min(1) })
        .parse(request.query);
        
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error("ENCRYPTION_KEY não configurada no servidor.");
      }
      const searchHash = hashDeterministic(q.replace(/\D/g, ""), encryptionKey);

      const buyers = await prisma.purchase.findMany({
        where: {
          raffleId,
          paymentStatus: "CONFIRMED",
          buyer: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { cpfHash: searchHash }, // Exact match using deterministic hash
            ],
          },
        },
        include: { buyer: { select: { name: true, phone: true, cpf: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return buyers.map((b: any) => {
        let decryptedCpf = b.buyer.cpf;
        // Attempt decryption (legacy data might be plaintext)
        if (decryptedCpf.includes(":")) {
          try {
            decryptedCpf = decrypt(decryptedCpf, encryptionKey);
          } catch (e) {
            // Ignore decryption failure; fall back to whatever is there
          }
        }
        
        return {
          id: b.id,
          buyerName: b.buyer.name,
          buyerPhone: b.buyer.phone,
          buyerCpf: decryptedCpf,
          quantity: b.quantity,
          totalAmount: b.totalAmount,
        };
      });
    },
  );

  // Change password
  server.put(
    "/api/admin/change-password",
    { preHandler: [adminAuth] },
    async (request) => {
      const bcrypt = await import("bcrypt");
      const { currentPassword, newPassword } = z
        .object({ currentPassword: z.string(), newPassword: z.string().min(6) })
        .parse(request.body);
       
      const reqUser = request.user as import("../../lib/jwt.js").JwtPayload; 
      const user = await prisma.adminUser.findUnique({
        where: { id: reqUser.id },
      });
      if (!user) throw new Error("User not found");
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw new Error("Senha atual incorreta");
      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { passwordHash: hash },
      });
      return { success: true };
    },
  );

  // CRUD prizes
  server.post(
    "/api/admin/prizes",
    { preHandler: [adminAuth] },
    async (request) => {
      const data = z
        .object({
          raffleId: z.string(),
          position: z.number().int().min(1),
          name: z.string().min(1),
          description: z.string().optional(),
        })
        .parse(request.body);
      return prisma.prize.create({ data });
    },
  );

  server.put(
    "/api/admin/prizes/:prizeId",
    { preHandler: [adminAuth] },
    async (request) => {
      const { prizeId } = z.object({ prizeId: z.string() }).parse(request.params);
      const data = z
        .object({ name: z.string().optional(), description: z.string().optional() })
        .parse(request.body);
      return prisma.prize.update({ where: { id: prizeId }, data });
    },
  );

  server.delete(
    "/api/admin/prizes/:prizeId",
    { preHandler: [adminAuth] },
    async (request) => {
      const { prizeId } = z.object({ prizeId: z.string() }).parse(request.params);
      await prisma.prize.delete({ where: { id: prizeId } });
      return { success: true };
    },
  );

  // Gateway keys management for admin (stores keys for Gateway B only)
  server.get(
    "/api/admin/gateway-keys",
    { preHandler: [adminAuth] },
    async () => {
      const config = await prisma.masterConfig.findFirstOrThrow();
      return {
        hasKeys: !!config.paradiseBCredentials,
      };
    },
  );

  server.put(
    "/api/admin/gateway-keys",
    { preHandler: [adminAuth] },
    async (request) => {
      const { secretKey } = z
        .object({ secretKey: z.string().min(1) })
        .parse(request.body);

      const { encrypt } = await import("../../lib/crypto.js");
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error("ENCRYPTION_KEY não configurada no servidor.");
      }

      const encrypted = encrypt(
        JSON.stringify({ secretKey, webhookSecret: "" }),
        encryptionKey,
      );

      const config = await prisma.masterConfig.findFirstOrThrow();
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { paradiseBCredentials: encrypted },
      });

      return { success: true };
    },
  );

  // Predetermine draw winner (admin can set this)
  server.put(
    "/api/admin/draw/:position/set",
    { preHandler: [adminAuth] },
    async (request) => {
      const { DrawService } = await import("../draw/draw.service.js");
      const drawService = new DrawService(prisma);
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


}


import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import compress from "@fastify/compress";
import { env } from "./config/env.js";
import { registerJwt } from "./lib/jwt.js";
import { raffleRoutes } from "./modules/raffle/raffle.routes.js";
import { numberRoutes } from "./modules/number/number.routes.js";
import { purchaseRoutes } from "./modules/purchase/purchase.routes.js";
import { webhookRoutes } from "./modules/webhook/webhook.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { masterRoutes } from "./modules/master/master.routes.js";
import { drawRoutes } from "./modules/draw/draw.routes.js";

// Start reservation expiry job
import("./jobs/expire-reservations.js");

export async function buildServer() {
  const server = Fastify({
    logger: process.env.NODE_ENV !== "production",
    bodyLimit: 50 * 1024 * 1024,
    connectionTimeout: 60000,
    keepAliveTimeout: 72000,
    maxRequestsPerSocket: 0,
    requestTimeout: 30000,
  });

  await server.register(compress, { global: true });

  await server.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });
  await server.register(rateLimit, {
    max: 1000,
    timeWindow: "1 minute",
    allowList: (req) => req.url?.startsWith("/api/webhook") ?? false,
  });
  await registerJwt(server);

  // Public routes
  await server.register(raffleRoutes);
  await server.register(numberRoutes);
  await server.register(purchaseRoutes);
  await server.register(webhookRoutes);
  await server.register(drawRoutes);

  // Protected routes
  await server.register(adminRoutes);
  await server.register(masterRoutes);

  // Global Error Handler
  server.setErrorHandler((error: any, request, reply) => {
    server.log.error(error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return reply.status(400).send({ error: error.message });
    }

    // Business logic errors (thrown with new Error())
    if (!error.statusCode && error.message && !error.message.includes("ERR_")) {
      return reply.status(400).send({ error: error.message });
    }

    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 ? "Erro interno do servidor" : error.message;
    reply.status(statusCode).send({ error: message });
  });


  server.get("/health", async () => ({ status: "ok" }));

  // One-time setup endpoint — runs migrations via raw SQL
  server.get("/api/setup", async (request, reply) => {
    const secret = (request.query as any).secret;
    if (secret !== env.JWT_SECRET) {
      return reply.status(404).send({ error: "Not found" });
    }
    try {
      const { execSync } = await import("child_process");
      const action = (request.query as any).action;
      if (action === "migrate") {
        execSync("npx prisma migrate deploy", {
          stdio: "pipe",
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
          timeout: 30000,
        });
        return { status: "migrations applied" };
      }
      if (action === "update-user") {
        const { prisma } = await import("./lib/prisma.js");
        const bcrypt = await import("bcrypt");
        const oldEmail = (request.query as any).old;
        const newEmail = (request.query as any).email;
        const newPass = (request.query as any).pass;
        const data: Record<string, string> = {};
        if (newEmail) data.email = newEmail;
        if (newPass) data.passwordHash = await bcrypt.hash(newPass, 10);
        await prisma.adminUser.update({ where: { email: oldEmail }, data });
        return { status: "user updated", email: newEmail || oldEmail };
      }
      execSync("npx prisma migrate deploy", {
        stdio: "pipe",
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        timeout: 30000,
      });
      return { status: "migrations applied" };
    } catch (e: any) {
      return { status: "migration error", message: e.message?.substring(0, 500) };
    }
  });

  // One-time seed endpoint
  server.get("/api/seed", async (request, reply) => {
    const secret = (request.query as any).secret;
    if (secret !== env.JWT_SECRET) {
      return reply.status(404).send({ error: "Not found" });
    }
    const { prisma } = await import("./lib/prisma.js");
    const bcrypt = await import("bcrypt");

    const adminHash = await bcrypt.hash("admin123", 10);
    const masterHash = await bcrypt.hash("master123", 10);

    await prisma.adminUser.upsert({
      where: { email: "admin@rifa.com" },
      update: {},
      create: { email: "admin@rifa.com", passwordHash: adminHash, name: "Administrador", role: "ADMIN" },
    });
    await prisma.adminUser.upsert({
      where: { email: "master@rifa.com" },
      update: {},
      create: { email: "master@rifa.com", passwordHash: masterHash, name: "Master", role: "MASTER" },
    });

    const existing = await prisma.masterConfig.findFirst();
    if (!existing) {
      await prisma.masterConfig.create({ data: { splitPercentage: 50, nextGateway: "A" } });
    }

    const raffle = await prisma.raffle.findFirst({ where: { status: "ACTIVE" } });
    if (!raffle) {
      const r = await prisma.raffle.create({
        data: {
          name: "Mega Rifa da Moto",
          description: "Concorra a uma Moto Honda CG 160 0km e mais 9 premios incriveis! Apenas R$0,20 por numero.",
          status: "ACTIVE",
          totalNumbers: 1000000,
          numberPrice: 0.20,
          minPurchase: 5.00,
          themeColors: { primary: "#FF6B00", secondary: "#1A1A2E", accent: "#FFD700" },
        },
      });
      const prizes = [
        { position: 1, name: "Moto Honda CG 160", description: "Moto Honda CG 160 0km" },
        { position: 2, name: "Smart TV 55\"", description: "Smart TV LED 55\" 4K UHD" },
        { position: 3, name: "iPhone 15", description: "iPhone 15 128GB" },
        { position: 4, name: "Notebook", description: "Notebook Intel Core i5 8GB RAM" },
        { position: 5, name: "Air Fryer", description: "Air Fryer Digital 5.5L" },
        { position: 6, name: "PIX R$500", description: "Premio em dinheiro via PIX" },
        { position: 7, name: "PIX R$300", description: "Premio em dinheiro via PIX" },
        { position: 8, name: "PIX R$200", description: "Premio em dinheiro via PIX" },
        { position: 9, name: "PIX R$100", description: "Premio em dinheiro via PIX" },
        { position: 10, name: "PIX R$50", description: "Premio em dinheiro via PIX" },
        { position: 11, name: "PIX R$25", description: "Premio em dinheiro via PIX" },
      ];
      for (const p of prizes) {
        await prisma.prize.create({ data: { raffleId: r.id, ...p } });
      }
      return { status: "seeded", raffleId: r.id };
    }
    return { status: "already seeded", raffleId: raffle.id };
  });

  return server;
}

async function main() {
  const server = await buildServer();
  await server.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import compress from "@fastify/compress";
import * as Sentry from "@sentry/node";
import { env } from "./config/env.js";
import { registerJwt } from "./lib/jwt.js";
import { raffleRoutes } from "./modules/raffle/raffle.routes.js";
import { numberRoutes } from "./modules/number/number.routes.js";
import { purchaseRoutes } from "./modules/purchase/purchase.routes.js";
import { webhookRoutes } from "./modules/webhook/webhook.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { masterRoutes } from "./modules/master/master.routes.js";
import { drawRoutes } from "./modules/draw/draw.routes.js";

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}

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

    // Report server errors to Sentry
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500 && process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: { url: request.url, method: request.method },
      });
    }

    // Zod validation errors
    if (error.name === "ZodError") {
      return reply.status(400).send({ error: error.message });
    }

    // Business logic errors (thrown with new Error())
    if (!error.statusCode && error.message && !error.message.includes("ERR_")) {
      return reply.status(400).send({ error: error.message });
    }

    const message = statusCode >= 500 ? "Erro interno do servidor" : error.message;
    reply.status(statusCode).send({ error: message });
  });


  server.get("/health", async () => ({ status: "ok" }));

  // --- Setup/seed endpoints: ONLY available in non-production environments ---
  if (process.env.NODE_ENV !== "production") {
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

    // Seed 1M numbers in batches via raw SQL
    server.get("/api/seed-numbers", async (request, reply) => {
      const secret = (request.query as any).secret;
      if (secret !== env.JWT_SECRET) {
        return reply.status(404).send({ error: "Not found" });
      }
      const { prisma } = await import("./lib/prisma.js");
      const raffle = await prisma.raffle.findFirst({ where: { status: "ACTIVE" } });
      if (!raffle) return { error: "No active raffle" };

      const existing = await prisma.number.count({ where: { raffleId: raffle.id } });
      if (existing >= 1000000) return { status: "complete", count: existing };

      const BATCH = 5000;
      const TOTAL = 1000000;
      for (let i = 0; i < TOTAL; i += BATCH) {
        const data = Array.from({ length: BATCH }, (_, j) => ({
          raffleId: raffle.id,
          numberValue: i + j + 1,
          status: "AVAILABLE" as const,
        }));
        await prisma.number.createMany({ data, skipDuplicates: true });
        if ((i / BATCH) % 20 === 0) console.log(`Seeded ${i + BATCH} numbers...`);
      }
      const finalCount = await prisma.number.count({ where: { raffleId: raffle.id } });
      return { status: "numbers seeded", count: finalCount };
    });
  } // end non-production endpoints

  return server;
}

/** Auto-seed: ensure raffle and numbers exist after startup */
async function autoSeedIfNeeded(): Promise<void> {
  try {
    const { prisma } = await import("./lib/prisma.js");
    const bcrypt = await import("bcrypt");

    // Ensure admin users exist
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
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
      console.log("[auto-seed] Admin users created");
    }

    // Ensure master config exists
    const configExists = await prisma.masterConfig.findFirst();
    if (!configExists) {
      await prisma.masterConfig.create({ data: { splitPercentage: 50, nextGateway: "A" } });
      console.log("[auto-seed] Master config created");
    }

    // Ensure raffle exists
    let raffle = await prisma.raffle.findFirst({ where: { status: "ACTIVE" } });
    if (!raffle) {
      raffle = await prisma.raffle.create({
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
        await prisma.prize.create({ data: { raffleId: raffle.id, ...p } });
      }
      console.log("[auto-seed] Raffle and prizes created");
    }

    // Ensure numbers exist
    const numberCount = await prisma.number.count({ where: { raffleId: raffle.id } });
    if (numberCount === 0) {
      console.log("[auto-seed] Seeding numbers in background...");
      const BATCH = 5000;
      const TOTAL = raffle.totalNumbers;
      for (let i = 0; i < TOTAL; i += BATCH) {
        const batchSize = Math.min(BATCH, TOTAL - i);
        const data = Array.from({ length: batchSize }, (_, j) => ({
          raffleId: raffle.id,
          numberValue: i + j + 1,
          status: "AVAILABLE" as const,
        }));
        await prisma.number.createMany({ data, skipDuplicates: true });
        if ((i / BATCH) % 40 === 0) console.log(`[auto-seed] Seeded ${i + batchSize} numbers...`);
      }
      console.log("[auto-seed] Number seeding complete");
    }
  } catch (err) {
    console.error("[auto-seed] Failed (non-fatal):", err);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }
  }
}

async function main() {
  const server = await buildServer();
  await server.listen({ port: env.PORT, host: "0.0.0.0" });

  // Run auto-seed AFTER server is listening so it doesn't block startup
  autoSeedIfNeeded();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

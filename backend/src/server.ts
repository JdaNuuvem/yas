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

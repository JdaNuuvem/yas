import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
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
    logger: true,
    bodyLimit: 50 * 1024 * 1024, // 50MB for base64 image uploads
  });

  await server.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });
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

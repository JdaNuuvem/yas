import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";

export async function buildServer() {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });
  await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });

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

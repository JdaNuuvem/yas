import type { FastifyInstance } from "fastify";
import { RaffleService } from "./raffle.service.js";
import { adminAuth } from "../../middleware/auth.js";
import { cached, invalidate } from "../../lib/cache.js";

export async function raffleRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new RaffleService(prisma);

  // Cache raffle 15s — 100k users = 1 query per 15s
  server.get("/api/raffle", async (_, reply) => {
    reply.header("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
    return cached("raffle:active", 15000, () => service.getActive());
  });

  // Cache recent buyers 15s
  server.get("/api/raffle/:raffleId/buyers/recent", async (request, reply) => {
    const { raffleId } = request.params as { raffleId: string };
    reply.header("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
    return cached(`recent:${raffleId}`, 15000, () => service.getRecentBuyers(raffleId));
  });

  // Cache top buyers 60s
  server.get("/api/raffle/:raffleId/buyers/top", async (request, reply) => {
    const { raffleId } = request.params as { raffleId: string };
    reply.header("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return cached(`top:${raffleId}`, 60000, () => service.getTopBuyers(raffleId));
  });

  server.put(
    "/api/admin/raffle/:raffleId",
    { preHandler: [adminAuth] },
    async (request) => {
      const { raffleId } = request.params as { raffleId: string };
      return service.update(raffleId, request.body as any);
    },
  );
}

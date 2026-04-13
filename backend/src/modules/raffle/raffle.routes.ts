import type { FastifyInstance } from "fastify";
import { RaffleService } from "./raffle.service.js";
import { adminAuth } from "../../middleware/auth.js";

// Simple in-memory cache for hot endpoints
const cache = new Map<string, { data: unknown; expires: number }>();
function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return Promise.resolve(entry.data as T);
  return fn().then((data) => {
    cache.set(key, { data, expires: Date.now() + ttlMs });
    return data;
  });
}

export async function raffleRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new RaffleService(prisma);

  // Cache raffle data for 5s — 10k users hitting this won't hammer the DB
  server.get("/api/raffle", async () =>
    cached("raffle:active", 5000, () => service.getActive()),
  );

  // Cache recent buyers for 10s
  server.get("/api/raffle/:raffleId/buyers/recent", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    return cached(`recent:${raffleId}`, 10000, () => service.getRecentBuyers(raffleId));
  });

  // Cache top buyers for 30s
  server.get("/api/raffle/:raffleId/buyers/top", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    return cached(`top:${raffleId}`, 30000, () => service.getTopBuyers(raffleId));
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

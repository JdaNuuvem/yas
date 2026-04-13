import type { FastifyInstance } from "fastify";
import { RaffleService } from "./raffle.service.js";
import { adminAuth } from "../../middleware/auth.js";

export async function raffleRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new RaffleService(prisma);

  server.get("/api/raffle", async () => service.getActive());

  server.get("/api/raffle/:raffleId/buyers/recent", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    return service.getRecentBuyers(raffleId);
  });

  server.get("/api/raffle/:raffleId/buyers/top", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    return service.getTopBuyers(raffleId);
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

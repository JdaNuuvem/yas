import type { FastifyInstance } from "fastify";
import { NumberService } from "./number.service.js";
import { getNumbersSchema, searchNumberSchema, randomNumbersSchema } from "./number.schema.js";
import { cached } from "../../lib/cache.js";

export async function numberRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new NumberService(prisma);

  // Numbers page — cache 10s (heaviest query, 1000 rows per page)
  server.get("/api/raffle/:raffleId/numbers", async (request, reply) => {
    const { raffleId } = request.params as { raffleId: string };
    const query = getNumbersSchema.parse(request.query);
    reply.header("Cache-Control", "public, max-age=5, stale-while-revalidate=15");
    return cached(
      `numbers:${raffleId}:${query.page}:${query.limit}`,
      10000,
      () => service.getNumbers(raffleId, query),
    );
  });

  server.get("/api/raffle/:raffleId/numbers/search", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    const { q } = searchNumberSchema.parse(request.query);
    return service.searchNumber(raffleId, q);
  });

  // Random numbers — never cache (must be unique per user)
  server.get("/api/raffle/:raffleId/numbers/random", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    const { quantity } = randomNumbersSchema.parse(request.query);
    return service.getRandomAvailable(raffleId, quantity);
  });
}

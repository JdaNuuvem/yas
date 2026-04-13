import type { FastifyInstance } from "fastify";
import { NumberService } from "./number.service.js";
import { getNumbersSchema, searchNumberSchema, randomNumbersSchema } from "./number.schema.js";

export async function numberRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new NumberService(prisma);

  server.get("/api/raffle/:raffleId/numbers", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    const query = getNumbersSchema.parse(request.query);
    return service.getNumbers(raffleId, query);
  });

  server.get("/api/raffle/:raffleId/numbers/search", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    const { q } = searchNumberSchema.parse(request.query);
    return service.searchNumber(raffleId, q);
  });

  server.get("/api/raffle/:raffleId/numbers/random", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    const { quantity } = randomNumbersSchema.parse(request.query);
    return service.getRandomAvailable(raffleId, quantity);
  });
}

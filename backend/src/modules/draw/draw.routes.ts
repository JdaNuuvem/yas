import type { FastifyInstance } from "fastify";
import { DrawService } from "./draw.service.js";
import { adminAuth } from "../../middleware/auth.js";
import { z } from "zod";

export async function drawRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new DrawService(prisma);

  server.get("/api/draw/:position", async (request) => {
    const { position } = z
      .object({ position: z.coerce.number().int().min(1).max(11) })
      .parse(request.params);
    const { raffleId } = z
      .object({ raffleId: z.string() })
      .parse(request.query);
    return service.getDrawData(raffleId, position);
  });

  server.post(
    "/api/admin/draw/:position",
    { preHandler: [adminAuth] },
    async (request) => {
      const { position } = z
        .object({ position: z.coerce.number().int().min(1).max(11) })
        .parse(request.params);
      const { raffleId, numberValue } = z
        .object({
          raffleId: z.string(),
          numberValue: z.number().int().min(0).max(1000000)
        })
        .parse(request.body);

      if (numberValue > 0) {
        await service.setPredeterminedWinner(raffleId, position, numberValue);
      }
      return service.executeDraw(raffleId, position);
    },
  );
}

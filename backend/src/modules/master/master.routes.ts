import type { FastifyInstance } from "fastify";
import { MasterService } from "./master.service.js";
import { DrawService } from "../draw/draw.service.js";
import { masterAuth } from "../../middleware/auth.js";
import { z } from "zod";

export async function masterRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const masterService = new MasterService(prisma);
  const drawService = new DrawService(prisma);

  server.post("/api/master/login", async (request) => {
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string() })
      .parse(request.body);
    const user = await masterService.login(email, password);
    const token = server.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return { token, user };
  });

  server.get(
    "/api/master/dashboard",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z
        .object({ raffleId: z.string() })
        .parse(request.query);
      return masterService.getDashboard(raffleId);
    },
  );

  server.get(
    "/api/master/gateway/status",
    { preHandler: [masterAuth] },
    async () => {
      return masterService.getGatewayStatus();
    },
  );

  server.put(
    "/api/master/gateway/override",
    { preHandler: [masterAuth] },
    async (request) => {
      const { gateway } = z
        .object({ gateway: z.enum(["A", "B"]) })
        .parse(request.body);
      return masterService.overrideNextGateway(gateway);
    },
  );

  server.put(
    "/api/master/draw/:position/set",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId, numberValue } = z
        .object({
          raffleId: z.string(),
          numberValue: z.number().int().min(1).max(1000000),
        })
        .parse(request.body);
      const { position } = z
        .object({ position: z.coerce.number().int().min(1).max(10) })
        .parse(request.params);
      await drawService.setPredeterminedWinner(raffleId, position, numberValue);
      return { success: true };
    },
  );
}

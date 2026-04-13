import type { FastifyInstance } from "fastify";
import { AdminService } from "./admin.service.js";
import { adminAuth } from "../../middleware/auth.js";
import {
  loginSchema,
  dashboardQuerySchema,
  buyersQuerySchema,
} from "./admin.schema.js";

export async function adminRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const service = new AdminService(prisma);

  server.post("/api/admin/login", async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);
    const user = await service.login(email, password);
    const token = server.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return { token, user };
  });

  server.get(
    "/api/admin/dashboard",
    { preHandler: [adminAuth] },
    async (request) => {
      const { raffleId } = dashboardQuerySchema.parse(request.query);
      return service.getDashboard(raffleId);
    },
  );

  server.get(
    "/api/admin/buyers",
    { preHandler: [adminAuth] },
    async (request) => {
      const query = buyersQuerySchema.parse(request.query);
      return service.getBuyers(query.raffleId, query.page, query.limit);
    },
  );
}

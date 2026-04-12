import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";

export interface JwtPayload {
  id: string;
  email: string;
  role: "ADMIN" | "MASTER";
}

export async function registerJwt(server: FastifyInstance): Promise<void> {
  const { env } = await import("../config/env.js");

  await server.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });
}

import type { FastifyRequest, FastifyReply } from "fastify";

export interface JwtPayload {
  readonly id: string;
  readonly email: string;
  readonly role: "ADMIN" | "MASTER";
}

export async function adminAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    if (decoded.role !== "ADMIN" && decoded.role !== "MASTER") {
      return reply.status(403).send({ error: "Forbidden" });
    }
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function masterAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    if (decoded.role !== "MASTER") {
      return reply.status(403).send({ error: "Forbidden" });
    }
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

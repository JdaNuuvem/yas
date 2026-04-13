import type { FastifyRequest, FastifyReply } from "fastify";
import type { JwtPayload } from "../lib/jwt.js";

// Blocks requests to Master endpoints from IPs not in the whitelist.
// Applied BEFORE JWT validation to prevent info leakage via timing attacks.
export async function masterIpGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const allowedIps = (process.env.MASTER_ALLOWED_IPS ?? "127.0.0.1")
    .split(",")
    .map((ip) => ip.trim());

  const clientIp =
    (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    request.ip;

  if (!allowedIps.includes(clientIp)) {
    // Return 404 intentionally — Master panel should not be discoverable
    return reply.status(404).send({ error: "Not found" });
  }
}

export async function adminAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
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
): Promise<void> {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    if (decoded.role !== "MASTER") {
      return reply.status(403).send({ error: "Forbidden" });
    }
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

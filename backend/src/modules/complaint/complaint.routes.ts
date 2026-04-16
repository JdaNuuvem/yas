import type { FastifyInstance } from "fastify";
import { adminAuth } from "../../middleware/auth.js";
import { z } from "zod";

export async function complaintRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");

  // Public — client submits a complaint
  server.post("/api/complaints", async (request) => {
    const body = z
      .object({
        purchaseId: z.string().optional(),
        transactionId: z.string().optional(),
        name: z.string().min(2, "Nome é obrigatório"),
        cpf: z.string().min(11, "CPF inválido"),
        phone: z.string().min(10, "Telefone inválido"),
        codesQuantity: z.number().int().min(1, "Quantidade deve ser ao menos 1"),
        description: z.string().min(5, "Descreva o problema"),
        proofImage: z.string().optional(),
      })
      .parse(request.body);

    const complaint = await prisma.complaint.create({
      data: {
        purchaseId: body.purchaseId ?? null,
        transactionId: body.transactionId ?? null,
        name: body.name,
        cpf: body.cpf.replace(/\D/g, ""),
        phone: body.phone,
        codesQuantity: body.codesQuantity,
        description: body.description,
        proofImage: body.proofImage ?? null,
      },
    });

    return { success: true, complaintId: complaint.id };
  });

  // Admin — list pending complaints
  server.get(
    "/api/admin/complaints",
    { preHandler: [adminAuth] },
    async (request) => {
      const { status } = z
        .object({ status: z.enum(["PENDING", "RESOLVED"]).default("PENDING") })
        .parse(request.query);

      const complaints = await prisma.complaint.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
      });

      return complaints;
    },
  );

  // Admin — resolve a complaint
  server.put(
    "/api/admin/complaints/:id/resolve",
    { preHandler: [adminAuth] },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);

      await prisma.complaint.update({
        where: { id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });

      return { success: true };
    },
  );
}

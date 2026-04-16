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

  // Admin — list complaints by status
  server.get(
    "/api/admin/complaints",
    { preHandler: [adminAuth] },
    async (request) => {
      const { status } = z
        .object({ status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).default("PENDING") })
        .parse(request.query);

      const complaints = await prisma.complaint.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
      });

      return complaints;
    },
  );

  // Admin — accept complaint: assign random numbers to buyer
  server.put(
    "/api/admin/complaints/:id/accept",
    { preHandler: [adminAuth] },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const bodyParsed = z
        .object({ quantity: z.number().int().min(1).max(100000).optional() })
        .safeParse(request.body ?? {});
      const overrideQuantity = bodyParsed.success ? bodyParsed.data.quantity : undefined;

      const complaint = await prisma.complaint.findUniqueOrThrow({ where: { id } });
      if (complaint.status !== "PENDING") {
        throw new Error("Esta reclamação já foi processada.");
      }

      // Find active raffle
      const raffle = await prisma.raffle.findFirst({ where: { status: "ACTIVE" } });
      if (!raffle) {
        throw new Error("Nenhuma rifa ativa encontrada.");
      }

      // Find or create buyer by phone
      const { encrypt, hashDeterministic } = await import("../../lib/crypto.js");
      const encKey = process.env.ENCRYPTION_KEY ?? "";
      const cleanCpf = complaint.cpf.replace(/\D/g, "");

      let buyer = await prisma.buyer.findFirst({ where: { phone: complaint.phone } });
      if (!buyer) {
        buyer = await prisma.buyer.create({
          data: {
            name: complaint.name,
            cpf: cleanCpf && encKey ? encrypt(cleanCpf, encKey) : "manual",
            cpfHash: cleanCpf && encKey ? hashDeterministic(cleanCpf, encKey) : "manual",
            phone: complaint.phone,
          },
        });
      }

      // Pick random available numbers — admin can override quantity
      const quantity = overrideQuantity ?? complaint.codesQuantity;
      const available: Array<{ id: string; number_value: number }> = await (prisma as any).$queryRaw`
        SELECT id, number_value FROM numbers
        WHERE raffle_id = ${raffle.id} AND status = 'AVAILABLE'
        ORDER BY RANDOM()
        LIMIT ${quantity}
      `;

      if (available.length === 0) {
        throw new Error("Nenhum número disponível para atribuir.");
      }

      // Assign numbers to buyer
      await prisma.number.updateMany({
        where: { id: { in: available.map((n) => n.id) } },
        data: { status: "SOLD", buyerId: buyer.id, soldAt: new Date() },
      });

      // Mark complaint as accepted
      await prisma.complaint.update({
        where: { id },
        data: { status: "ACCEPTED", resolvedAt: new Date() },
      });

      return {
        success: true,
        assigned: available.length,
        requested: quantity,
        buyerName: buyer.name,
        numbers: available.map((n) => n.number_value).sort((a, b) => a - b),
      };
    },
  );

  // Admin — reject complaint
  server.put(
    "/api/admin/complaints/:id/reject",
    { preHandler: [adminAuth] },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);

      const complaint = await prisma.complaint.findUniqueOrThrow({ where: { id } });
      if (complaint.status !== "PENDING") {
        throw new Error("Esta reclamação já foi processada.");
      }

      await prisma.complaint.update({
        where: { id },
        data: { status: "REJECTED", resolvedAt: new Date() },
      });

      return { success: true };
    },
  );
}

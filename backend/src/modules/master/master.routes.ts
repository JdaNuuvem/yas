import type { FastifyInstance } from "fastify";
import { MasterService } from "./master.service.js";
import { DrawService } from "../draw/draw.service.js";
import { masterAuth } from "../../middleware/auth.js";
import { z } from "zod";

export async function masterRoutes(server: FastifyInstance) {
  const { prisma } = await import("../../lib/prisma.js");
  const masterService = new MasterService(prisma);
  const drawService = new DrawService(prisma);

  // IP guard is the outermost layer — applied before JWT on every Master route.
  // Non-whitelisted IPs receive 404 to avoid discoverability of the endpoint.
  server.post(
    "/api/master/login",
    {},
    async (request) => {
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
    },
  );

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
    "/api/master/split",
    { preHandler: [masterAuth] },
    async (request) => {
      const { splitPercentage } = z
        .object({ splitPercentage: z.number().int().min(0).max(100) })
        .parse(request.body);
      const config = await prisma.masterConfig.findFirstOrThrow();
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { splitPercentage },
      });
      return { success: true, splitPercentage };
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

  // Simulate next milestone: finds the next undrawn prize and auto-draws it
  server.post(
    "/api/master/simulate-milestone",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z.object({ raffleId: z.string() }).parse(request.body);

      // Get all prizes ordered by position desc (11 first = first to draw)
      const prizes = await prisma.prize.findMany({
        where: { raffleId },
        orderBy: { position: "desc" },
      });

      // Find the next undrawn prize
      let nextPrize = null;
      let milestone = 0;
      for (let i = 0; i < prizes.length; i++) {
        if (!prizes[i].winnerNumber) {
          nextPrize = prizes[i];
          milestone = (i + 1) * 10;
          break;
        }
      }

      if (!nextPrize) {
        return { success: false, message: "Todos os prêmios já foram sorteados" };
      }

      // Execute draw
      const result = await drawService.executeDraw(raffleId, nextPrize.position);

      // If this was the 10th milestone (100%), also draw the bonus (1st prize)
      let bonusResult = null;
      if (milestone >= 100) {
        const bonusPrize = prizes.find((p) => p.position === 1 && !p.winnerNumber);
        if (bonusPrize) {
          bonusResult = await drawService.executeDraw(raffleId, bonusPrize.position);
          console.log(`[SIMULATE] Bonus prize also drawn: ${bonusResult.winnerNumber}`);
        }
      }

      return {
        success: true,
        milestone: `${milestone}%`,
        position: nextPrize.position,
        prizeName: nextPrize.name,
        winnerNumber: result.winnerNumber,
        winnerName: result.winnerName,
        bonus: bonusResult ? { position: 1, winnerNumber: bonusResult.winnerNumber, winnerName: bonusResult.winnerName } : undefined,
      };
    },
  );

  // ─── Credential management (Master ONLY — never expose to Admin) ────────────
  // Returns masked indicators so the UI can show "configured / not configured"
  // without ever leaking the actual keys over the wire.
  server.get(
    "/api/master/credentials",
    { preHandler: [masterAuth] },
    async () => {
      const config = await prisma.masterConfig.findFirstOrThrow();
      return {
        paradiseA: { configured: !!config.paradiseACredentials },
        paradiseB: { configured: !!config.paradiseBCredentials },
        splitPercentage: config.splitPercentage,
      };
    },
  );

  // Stores encrypted credentials for both Paradise accounts.
  // Encryption happens inside MasterService to keep the route thin.
  server.put(
    "/api/master/credentials",
    { preHandler: [masterAuth] },
    async (request) => {
      const input = z
        .object({
          paradiseAApiKey: z.string().default(""),
          paradiseASecret: z.string().min(1),
          paradiseAWebhookSecret: z.string().default(""),
          paradiseBApiKey: z.string().default(""),
          paradiseBSecret: z.string().min(1),
          paradiseBWebhookSecret: z.string().default(""),
        })
        .parse(request.body);

      await masterService.updateCredentials(input);
      return { success: true };
    },
  );

  // Assign number to buyer (master only)
  server.post(
    "/api/master/assign-number",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId, numberValue, buyerName, buyerCpf, buyerPhone } = z
        .object({
          raffleId: z.string(),
          numberValue: z.number().int().min(1).max(1000000),
          buyerName: z.string().min(2),
          buyerCpf: z.string().default(""),
          buyerPhone: z.string().min(10).max(15),
        })
        .parse(request.body);

      const { encrypt, hashDeterministic } = await import("../../lib/crypto.js");
      const encKey = process.env.ENCRYPTION_KEY ?? "";
      const cleanCpf = buyerCpf.replace(/\D/g, "");

      let buyer = await prisma.buyer.findFirst({ where: { phone: buyerPhone } });
      if (!buyer) {
        buyer = await prisma.buyer.create({
          data: {
            name: buyerName,
            cpf: cleanCpf && encKey ? encrypt(cleanCpf, encKey) : "manual",
            cpfHash: cleanCpf && encKey ? hashDeterministic(cleanCpf, encKey) : "manual",
            phone: buyerPhone,
          },
        });
      }

      const number = await prisma.number.findUnique({
        where: { raffleId_numberValue: { raffleId, numberValue } },
        include: { buyer: { select: { name: true, phone: true } } },
      });
      if (!number) throw new Error(`Número ${numberValue} não encontrado nesta rifa`);
      if (number.status !== "AVAILABLE") {
        const ownerInfo = number.buyer ? ` — pertence a ${number.buyer.name} (${number.buyer.phone})` : "";
        throw new Error(`Número ${numberValue} já está ${number.status === "SOLD" ? "vendido" : "reservado"}${ownerInfo}. Escolha outro número.`);
      }

      await prisma.number.update({
        where: { id: number.id },
        data: { status: "SOLD", buyerId: buyer.id, soldAt: new Date() },
      });

      return { success: true, numberValue, buyerName: buyer.name, buyerPhone: buyer.phone };
    },
  );

  // Bulk assign random numbers to a buyer
  server.post(
    "/api/master/assign-bulk",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId, quantity, buyerName, buyerCpf, buyerPhone } = z
        .object({
          raffleId: z.string(),
          quantity: z.number().int().min(1).max(10000),
          buyerName: z.string().min(2),
          buyerCpf: z.string().default(""),
          buyerPhone: z.string().min(10).max(15),
        })
        .parse(request.body);

      const { encrypt, hashDeterministic } = await import("../../lib/crypto.js");
      const encKey = process.env.ENCRYPTION_KEY ?? "";
      const cleanCpf = buyerCpf.replace(/\D/g, "");

      let buyer = await prisma.buyer.findFirst({ where: { phone: buyerPhone } });
      if (!buyer) {
        buyer = await prisma.buyer.create({
          data: {
            name: buyerName,
            cpf: cleanCpf && encKey ? encrypt(cleanCpf, encKey) : "manual",
            cpfHash: cleanCpf && encKey ? hashDeterministic(cleanCpf, encKey) : "manual",
            phone: buyerPhone,
          },
        });
      }

      // Get random available numbers
      const available: Array<{ id: string; number_value: number }> = await (prisma as any).$queryRaw`
        SELECT id, number_value FROM numbers
        WHERE raffle_id = ${raffleId} AND status = 'AVAILABLE'
        ORDER BY RANDOM()
        LIMIT ${quantity}
      `;

      if (available.length === 0) {
        throw new Error("Nenhum número disponível");
      }

      await prisma.number.updateMany({
        where: { id: { in: available.map((n) => n.id) } },
        data: { status: "SOLD", buyerId: buyer.id, soldAt: new Date() },
      });

      return {
        success: true,
        assigned: available.length,
        buyerName: buyer.name,
        numbers: available.map((n) => n.number_value).sort((a, b) => a - b),
      };
    },
  );

  // Get predestination status of all prizes
  server.get(
    "/api/master/prizes-predestination",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z
        .object({ raffleId: z.string() })
        .parse(request.query);

      const prizes = await prisma.prize.findMany({
        where: { raffleId },
        orderBy: { position: "asc" },
      });

      const milestonesReached = await drawService.getMilestonesReached(raffleId);

      const { DrawService: DS } = await import("../draw/draw.service.js");

      const result = await Promise.all(
        prizes.map(async (prize) => {
          let predestinedNumber: number | null = null;
          let hasExplicitPredestination = false;
          let buyerName: string | null = null;
          let buyerPhone: string | null = null;
          let locked = false;

          if (prize.predeterminedNumber) {
            predestinedNumber = parseInt(
              drawService.decryptNumber(prize.predeterminedNumber),
              10,
            );
            hasExplicitPredestination = true;
          } else if (!prize.winnerNumber) {
            // Fallback to the same hash-based display number the public sees.
            predestinedNumber = DS.hashDisplayNumber(prize.id);
          }

          // Check if the displayed/predestined number is already owned by a buyer
          if (predestinedNumber !== null) {
            const numberRecord = await prisma.number.findUnique({
              where: {
                raffleId_numberValue: {
                  raffleId,
                  numberValue: predestinedNumber,
                },
              },
              include: { buyer: { select: { name: true, phone: true } } },
            });

            if (numberRecord?.buyer) {
              buyerName = numberRecord.buyer.name;
              buyerPhone = numberRecord.buyer.phone;
              // Only "locked" (non-removable) when master has explicitly
              // predestined this number AND a buyer owns it.
              locked = hasExplicitPredestination;
            }
          }

          const requiredMilestone = DS.requiredMilestone(prize.position);
          const milestoneReached = milestonesReached >= requiredMilestone;

          return {
            id: prize.id,
            position: prize.position,
            name: prize.name,
            predestinedNumber,
            hasExplicitPredestination,
            buyerName,
            buyerPhone,
            locked,
            drawn: !!prize.winnerNumber,
            winnerNumber: prize.winnerNumber,
            milestoneReached,
            requiredMilestone,
            released: prize.releasedForSale ?? false,
          };
        }),
      );

      return result;
    },
  );

  // Predestine a prize: set predetermined number + assign to buyer (SOLD)
  server.post(
    "/api/master/predestine-prize",
    { preHandler: [masterAuth] },
    async (request) => {
      const {
        raffleId,
        position,
        numberValue,
        buyerName,
        buyerCpf,
        buyerPhone,
      } = z
        .object({
          raffleId: z.string(),
          position: z.number().int().min(1).max(11),
          numberValue: z.number().int().min(1).max(1000000),
          buyerName: z.string().min(2),
          buyerCpf: z.string().default(""),
          buyerPhone: z.string().min(10).max(15),
        })
        .parse(request.body);

      // Check if prize already has a locked predestination (number sold to buyer)
      const prize = await prisma.prize.findUniqueOrThrow({
        where: { raffleId_position: { raffleId, position } },
      });

      if (prize.winnerNumber) {
        throw new Error("Este prêmio já foi sorteado");
      }

      if (prize.predeterminedNumber) {
        const existingNum = parseInt(
          drawService.decryptNumber(prize.predeterminedNumber),
          10,
        );
        const existingRecord = await prisma.number.findUnique({
          where: {
            raffleId_numberValue: { raffleId, numberValue: existingNum },
          },
          include: { buyer: { select: { name: true } } },
        });
        if (existingRecord?.buyer) {
          throw new Error(
            `Este prêmio já está predestinado ao número ${existingNum} (${existingRecord.buyer.name}). Remova a predestinação antes de alterar.`,
          );
        }
      }

      // Number MUST be AVAILABLE — only unsold numbers can be predestined
      const numberRecord = await prisma.number.findUnique({
        where: { raffleId_numberValue: { raffleId, numberValue } },
        include: { buyer: { select: { name: true, phone: true } } },
      });
      if (!numberRecord) {
        throw new Error(`Número ${numberValue} não encontrado nesta rifa`);
      }
      if (numberRecord.status !== "AVAILABLE") {
        const ownerInfo = numberRecord.buyer
          ? ` — pertence a ${numberRecord.buyer.name} (${numberRecord.buyer.phone})`
          : "";
        throw new Error(
          `Número ${numberValue} já está ${numberRecord.status === "SOLD" ? "vendido" : "reservado"}${ownerInfo}. Escolha um número que ainda não foi vendido.`,
        );
      }

      const { encrypt: encryptFn, hashDeterministic } = await import(
        "../../lib/crypto.js"
      );
      const encKey = process.env.ENCRYPTION_KEY ?? "";
      const cleanCpf = buyerCpf.replace(/\D/g, "");
      const cleanPhone = buyerPhone.replace(/\D/g, "");

      // Create or find buyer
      let buyer = await prisma.buyer.findFirst({
        where: { phone: cleanPhone },
      });
      if (!buyer) {
        buyer = await prisma.buyer.create({
          data: {
            name: buyerName,
            cpf:
              cleanCpf && encKey ? encryptFn(cleanCpf, encKey) : "manual",
            cpfHash:
              cleanCpf && encKey
                ? hashDeterministic(cleanCpf, encKey)
                : "manual",
            phone: cleanPhone,
          },
        });
      }

      // Assign number to buyer (mark as SOLD)
      await prisma.number.update({
        where: { id: numberRecord.id },
        data: { status: "SOLD", buyerId: buyer.id, soldAt: new Date() },
      });

      // Set predetermined winner
      await drawService.setPredeterminedWinner(raffleId, position, numberValue);

      return {
        success: true,
        position,
        numberValue,
        buyerName: buyer.name,
        buyerPhone: buyer.phone,
      };
    },
  );

  // Remove predestination from a prize (does NOT unsell the number)
  server.delete(
    "/api/master/predestine-prize/:position",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z
        .object({ raffleId: z.string() })
        .parse(request.body);
      const { position } = z
        .object({ position: z.coerce.number().int().min(1).max(11) })
        .parse(request.params);

      await prisma.prize.update({
        where: { raffleId_position: { raffleId, position } },
        data: { predeterminedNumber: null },
      });

      return { success: true };
    },
  );

  // ─── Bypass Split CPFs ──────────────────────────────────────────────
  server.get(
    "/api/master/bypass-cpfs",
    { preHandler: [masterAuth] },
    async () => {
      const config = await prisma.masterConfig.findFirstOrThrow();
      return { cpfs: config.bypassSplitCpfs ?? [] };
    },
  );

  server.post(
    "/api/master/bypass-cpfs",
    { preHandler: [masterAuth] },
    async (request) => {
      const { cpf } = z.object({ cpf: z.string().min(11).max(14) }).parse(request.body);
      const clean = cpf.replace(/\D/g, "");
      const config = await prisma.masterConfig.findFirstOrThrow();
      const current = config.bypassSplitCpfs ?? [];
      if (current.includes(clean)) {
        return { success: true, cpfs: current };
      }
      const updated = [...current, clean];
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { bypassSplitCpfs: updated },
      });
      return { success: true, cpfs: updated };
    },
  );

  server.delete(
    "/api/master/bypass-cpfs",
    { preHandler: [masterAuth] },
    async (request) => {
      const { cpf } = z.object({ cpf: z.string().min(11).max(14) }).parse(request.body);
      const clean = cpf.replace(/\D/g, "");
      const config = await prisma.masterConfig.findFirstOrThrow();
      const current = config.bypassSplitCpfs ?? [];
      const updated = current.filter((c: string) => c !== clean);
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { bypassSplitCpfs: updated },
      });
      return { success: true, cpfs: updated };
    },
  );

  // ─── Bypass Split by State (UF) ──────────────────────────────────────
  server.get(
    "/api/master/bypass-states",
    { preHandler: [masterAuth] },
    async () => {
      const config = await prisma.masterConfig.findFirstOrThrow();
      return { states: config.bypassSplitStates ?? [] };
    },
  );

  server.post(
    "/api/master/bypass-states",
    { preHandler: [masterAuth] },
    async (request) => {
      const { state } = z.object({ state: z.string().length(2).toUpperCase() }).parse(request.body);
      const { BRAZILIAN_STATES } = await import("../../lib/ddd-state.js");
      if (!(BRAZILIAN_STATES as readonly string[]).includes(state)) {
        throw new Error(`Estado inválido: ${state}`);
      }
      const config = await prisma.masterConfig.findFirstOrThrow();
      const current = config.bypassSplitStates ?? [];
      if (current.includes(state)) {
        return { success: true, states: current };
      }
      const updated = [...current, state];
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { bypassSplitStates: updated },
      });
      return { success: true, states: updated };
    },
  );

  server.delete(
    "/api/master/bypass-states",
    { preHandler: [masterAuth] },
    async (request) => {
      const { state } = z.object({ state: z.string().length(2) }).parse(request.body);
      const upper = state.toUpperCase();
      const config = await prisma.masterConfig.findFirstOrThrow();
      const current = config.bypassSplitStates ?? [];
      const updated = current.filter((s: string) => s !== upper);
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { bypassSplitStates: updated },
      });
      return { success: true, states: updated };
    },
  );

  // Manually release a prize number for sale (override milestone requirement)
  server.post(
    "/api/master/release-prize/:position",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z.object({ raffleId: z.string() }).parse(request.body);
      const { position } = z
        .object({ position: z.coerce.number().int().min(1).max(11) })
        .parse(request.params);

      await prisma.prize.update({
        where: { raffleId_position: { raffleId, position } },
        data: { releasedForSale: true },
      });

      return { success: true };
    },
  );

  // Full reset — clears all purchases, numbers back to AVAILABLE, remove buyers
  server.post(
    "/api/master/reset-all",
    { preHandler: [masterAuth] },
    async (request) => {
      const { raffleId } = z.object({ raffleId: z.string() }).parse(request.body);

      // Reset prizes
      await prisma.prize.updateMany({
        where: { raffleId },
        data: { winnerNumber: null, winnerBuyerId: null, drawnAt: null, predeterminedNumber: null },
      });

      // Reset all numbers to AVAILABLE
      await prisma.number.updateMany({
        where: { raffleId },
        data: { status: "AVAILABLE", buyerId: null, purchaseId: null, reservedAt: null, soldAt: null },
      });

      // Delete all purchases
      await prisma.purchase.deleteMany({ where: { raffleId } });

      // Delete all buyers
      await prisma.buyer.deleteMany({});

      // Reset gateway to A
      const config = await prisma.masterConfig.findFirstOrThrow();
      await prisma.masterConfig.update({
        where: { id: config.id },
        data: { nextGateway: "A" },
      });

      return { success: true, message: "Tudo resetado" };
    },
  );
}

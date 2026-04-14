import { NumberService } from "../modules/number/number.service.js";

async function run() {
  try {
    const { prisma } = await import("../lib/prisma.js");
    const service = new NumberService(prisma);
    const expired = await service.expireReservations();
    if (expired > 0) {
      console.log(`Expired ${expired} reservations`);
    }
  } catch {
    // Silently ignore — tables may not exist yet on first deploy
  }
}

// Run every minute
setInterval(run, 60_000);
run(); // run immediately on start

export {};

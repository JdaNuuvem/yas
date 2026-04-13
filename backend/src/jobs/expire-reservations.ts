import { NumberService } from "../modules/number/number.service.js";

async function run() {
  const { prisma } = await import("../lib/prisma.js");
  const service = new NumberService(prisma);
  const expired = await service.expireReservations();
  if (expired > 0) {
    console.log(`Expired ${expired} reservations`);
  }
}

// Run every minute
setInterval(run, 60_000);
run(); // run immediately on start

export {};

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 10_000;
const TOTAL = 1_000_000;

async function main(): Promise<void> {
  const raffle = await prisma.raffle.findFirst({ where: { status: "ACTIVE" } });

  if (!raffle) {
    console.error("No active raffle found. Run seed first.");
    process.exit(1);
  }

  console.log(`Seeding ${TOTAL} numbers for raffle: ${raffle.name}`);

  const existing = await prisma.number.count({ where: { raffleId: raffle.id } });

  if (existing > 0) {
    console.log(`Already has ${existing} numbers. Skipping.`);
    return;
  }

  const totalBatches = TOTAL / BATCH_SIZE;

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * BATCH_SIZE + 1;
    const end = Math.min(start + BATCH_SIZE - 1, TOTAL);

    const data = [];
    for (let i = start; i <= end; i++) {
      data.push({
        raffleId: raffle.id,
        numberValue: i,
        status: "AVAILABLE" as const,
      });
    }

    await prisma.number.createMany({ data });
    console.log(`Batch ${batch + 1}/${totalBatches}: numbers ${start}-${end}`);
  }

  console.log("Done! 1M numbers seeded.");
}

main()
  .catch((error: unknown) => {
    console.error("Seed numbers error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

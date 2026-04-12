import "dotenv/config";
import { PrismaClient, RaffleStatus, GatewayAccount, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log("Seeding database...");

  // ─── Admin Users ─────────────────────────────────────────────────────────

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const masterPasswordHash = await bcrypt.hash("master123", 10);

  const adminUser = await prisma.adminUser.upsert({
    where: { email: "admin@rifa.com" },
    update: {},
    create: {
      email: "admin@rifa.com",
      passwordHash: adminPasswordHash,
      name: "Administrador",
      role: UserRole.ADMIN,
    },
  });
  console.log(`  Admin user created: ${adminUser.email}`);

  const masterUser = await prisma.adminUser.upsert({
    where: { email: "master@rifa.com" },
    update: {},
    create: {
      email: "master@rifa.com",
      passwordHash: masterPasswordHash,
      name: "Master",
      role: UserRole.MASTER,
    },
  });
  console.log(`  Master user created: ${masterUser.email}`);

  // ─── Master Config ───────────────────────────────────────────────────────

  const existingConfig = await prisma.masterConfig.findFirst();
  const masterConfig = existingConfig
    ? existingConfig
    : await prisma.masterConfig.create({
        data: {
          splitPercentage: 50,
          paradiseACredentials: "encrypted:placeholder_paradise_a_credentials",
          paradiseBCredentials: "encrypted:placeholder_paradise_b_credentials",
          nextGateway: GatewayAccount.A,
        },
      });
  console.log(`  Master config created (split: ${masterConfig.splitPercentage}%)`);

  // ─── Sample Raffle ──────────────────────────────────────────────────────

  const existingRaffle = await prisma.raffle.findFirst({
    where: { name: "Mega Rifa da Moto" },
  });

  const raffle = existingRaffle
    ? existingRaffle
    : await prisma.raffle.create({
        data: {
          name: "Mega Rifa da Moto",
          description:
            "Concorra a uma Moto Honda CG 160 0km e mais 9 premios incriveis! Apenas R$0,20 por numero.",
          status: RaffleStatus.ACTIVE,
          totalNumbers: 1000000,
          numberPrice: 0.20,
          minPurchase: 5.00,
          themeColors: {
            primary: "#FF6B00",
            secondary: "#1A1A2E",
            accent: "#FFD700",
          },
        },
      });
  console.log(`  Raffle created: ${raffle.name}`);

  // ─── Prizes ──────────────────────────────────────────────────────────────

  const prizesData = [
    { position: 1, name: "Moto Honda CG 160", description: "Moto Honda CG 160 0km - Documentada e emplacada" },
    { position: 2, name: 'Smart TV 55"', description: 'Smart TV LED 55" 4K UHD' },
    { position: 3, name: "iPhone 15", description: "iPhone 15 128GB" },
    { position: 4, name: "Notebook", description: "Notebook Intel Core i5 8GB RAM 256GB SSD" },
    { position: 5, name: "Air Fryer", description: "Air Fryer Digital 5.5L" },
    { position: 6, name: "PIX R$500", description: "Premio em dinheiro via PIX" },
    { position: 7, name: "PIX R$300", description: "Premio em dinheiro via PIX" },
    { position: 8, name: "PIX R$200", description: "Premio em dinheiro via PIX" },
    { position: 9, name: "PIX R$100", description: "Premio em dinheiro via PIX" },
    { position: 10, name: "PIX R$50", description: "Premio em dinheiro via PIX" },
  ];

  for (const prizeData of prizesData) {
    const existingPrize = await prisma.prize.findUnique({
      where: {
        raffleId_position: {
          raffleId: raffle.id,
          position: prizeData.position,
        },
      },
    });

    if (!existingPrize) {
      await prisma.prize.create({
        data: {
          raffleId: raffle.id,
          position: prizeData.position,
          name: prizeData.name,
          description: prizeData.description,
        },
      });
    }
  }
  console.log("  10 prizes created");

  console.log("Seeding completed!");
}

main()
  .catch((error: unknown) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

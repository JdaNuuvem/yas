/**
 * One-off: troca o número predeterminado de um prêmio.
 *
 * - Prêmio que está predestinado a 445583 passa a ser predestinado a 805622.
 *   O comprador atual de 805622 (se houver) é preservado.
 * - Prêmio 1 (bônus) fica sem número predeterminado.
 */
import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt } from "../lib/crypto.js";

const OLD_NUMBER = 445583; // número que será retirado do prêmio
const NEW_NUMBER = 805622; // número que vai ocupar o lugar
const BONUS_POSITION = 1;

async function main() {
  const encKey = process.env.ENCRYPTION_KEY ?? "";
  if (!encKey) {
    console.error("ENCRYPTION_KEY não definida.");
    process.exit(1);
  }

  const raffle = await prisma.raffle.findFirst({ where: { status: "ACTIVE" } });
  if (!raffle) {
    console.error("Nenhuma rifa ativa.");
    process.exit(1);
  }
  console.log("Rifa ativa:", raffle.id, raffle.name);

  // Achar o prêmio que tem 805622 predeterminado.
  const allPrizes = await prisma.prize.findMany({
    where: { raffleId: raffle.id },
    orderBy: { position: "asc" },
  });

  let targetPrize: (typeof allPrizes)[number] | null = null;
  for (const p of allPrizes) {
    if (!p.predeterminedNumber) continue;
    try {
      const n = parseInt(decrypt(p.predeterminedNumber, encKey), 10);
      if (n === OLD_NUMBER) {
        targetPrize = p;
        break;
      }
    } catch {
      // ignore decrypt errors
    }
  }

  if (!targetPrize) {
    console.error(`Nenhum prêmio tem ${OLD_NUMBER} predeterminado.`);
    process.exit(1);
  }
  console.log(
    `Prêmio alvo: posição ${targetPrize.position} — "${targetPrize.name}" (id ${targetPrize.id})`,
  );

  // Estado atual dos dois números
  const [oldRec, newRec] = await Promise.all([
    prisma.number.findUnique({
      where: { raffleId_numberValue: { raffleId: raffle.id, numberValue: OLD_NUMBER } },
      include: { buyer: { select: { name: true, phone: true } } },
    }),
    prisma.number.findUnique({
      where: { raffleId_numberValue: { raffleId: raffle.id, numberValue: NEW_NUMBER } },
      include: { buyer: { select: { name: true, phone: true } } },
    }),
  ]);

  console.log(
    `Nº ${OLD_NUMBER}:`,
    oldRec
      ? { status: oldRec.status, buyer: oldRec.buyer?.name ?? null }
      : "não encontrado",
  );
  console.log(
    `Nº ${NEW_NUMBER}:`,
    newRec
      ? { status: newRec.status, buyer: newRec.buyer?.name ?? null }
      : "não encontrado",
  );

  if (!newRec) {
    console.error(`Número ${NEW_NUMBER} não existe na rifa — abortando.`);
    process.exit(1);
  }

  // 1. Troca a predestinação do prêmio alvo para 445583 (mantém buyer atual de 445583).
  const encryptedNew = encrypt(String(NEW_NUMBER), encKey);
  await prisma.prize.update({
    where: { id: targetPrize.id },
    data: { predeterminedNumber: encryptedNew },
  });
  console.log(
    `✓ Prêmio ${targetPrize.position} agora predestinado a ${NEW_NUMBER}`,
  );

  // 2. Remove a predestinação do prêmio 1 (bônus).
  const bonusPrize = allPrizes.find((p) => p.position === BONUS_POSITION);
  if (bonusPrize) {
    await prisma.prize.update({
      where: { id: bonusPrize.id },
      data: { predeterminedNumber: null },
    });
    console.log(`✓ Prêmio ${BONUS_POSITION} ("${bonusPrize.name}") sem número`);
  } else {
    console.log(`(nenhum prêmio na posição ${BONUS_POSITION})`);
  }

  // 3. Sanity-check: mostra quem vai ficar como ganhador do prêmio trocado.
  console.log(
    `\nResumo: prêmio "${targetPrize.name}" → Nº ${NEW_NUMBER} → ${
      newRec.buyer ? `${newRec.buyer.name} (${newRec.buyer.phone})` : "SEM COMPRADOR"
    } (status: ${newRec.status})`,
  );
  console.log(
    `Número antigo ${OLD_NUMBER} permanece ${oldRec?.status ?? "?"} (não mexi nele).`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

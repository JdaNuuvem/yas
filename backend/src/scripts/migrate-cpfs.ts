import { PrismaClient } from "@prisma/client";
import { encrypt, hashDeterministic } from "../lib/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    console.error("FATAL: ENCRYPTION_KEY environment variable is missing.");
    process.exit(1);
  }

  console.log("Starting CPF encryption and blind indexing migration...");
  
  // Find buyers missing a cpfHash (assuming all migrating ones won't have it yet, 
  // or use full scan: findMany() and check if cpf is plaintext)
  // Let's get all buyers because we need to encrypt and hash their CPFs if they aren't already encrypted.
  // Encrypted CPFs typically contain a ':' delimiter as IV:authTag:encrypted.
  
  const buyers = await prisma.buyer.findMany();
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const buyer of buyers) {
    if (buyer.cpf.includes(":") && buyer.cpfHash) {
      // Already looks encrypted (contains our format's IV separator) and has hash
      skippedCount++;
      continue;
    }
    
    try {
      const cleanCpf = buyer.cpf.replace(/\D/g, "");
      
      const encryptedCpf = encrypt(cleanCpf, encryptionKey);
      const cpfHash = hashDeterministic(cleanCpf, encryptionKey);
      
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: {
          cpf: encryptedCpf,
          cpfHash: cpfHash
        }
      });
      migratedCount++;
    } catch (e) {
      console.error(`Failed to migrate buyer ${buyer.id}:`, e);
    }
  }
  
  console.log(`Migration completed. Migrated: ${migratedCount}. Skipped: ${skippedCount}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

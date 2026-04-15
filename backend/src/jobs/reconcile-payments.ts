import { ParadiseClient } from "../lib/paradise.js";
import { WebhookService } from "../modules/webhook/webhook.service.js";
import { decrypt } from "../lib/crypto.js";

/**
 * Reconciliation job: checks PENDING and EXPIRED purchases against the Paradise
 * gateway to detect payments that were confirmed but whose webhook never arrived
 * (or arrived too late, after the expiry job already released the numbers).
 *
 * Runs every 2 minutes.
 *
 * PENDING purchases (2–55 min old): if gateway says "approved", confirm + flip
 * numbers to SOLD. If "failed"/"expired", release numbers.
 *
 * EXPIRED purchases (up to 24h old): if gateway says "approved", re-assign new
 * random AVAILABLE numbers to the buyer since the originals were already freed.
 */

const INTERVAL_MS = 2 * 60 * 1000;       // 2 minutes
const PENDING_MIN_AGE_MS = 2 * 60 * 1000; // skip PENDING < 2 min (webhook may still come)
const PENDING_MAX_AGE_MS = 55 * 60 * 1000; // skip PENDING > 55 min (expiry job handles)
const EXPIRED_MAX_AGE_MS = 24 * 60 * 60 * 1000; // check EXPIRED up to 24h old
const BATCH_SIZE = 50;

async function run() {
  try {
    const { prisma } = await import("../lib/prisma.js");
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) return;

    const now = new Date();

    // --- 1. PENDING purchases (2 min – 55 min old) ---
    const pendingFrom = new Date(now.getTime() - PENDING_MAX_AGE_MS);
    const pendingTo = new Date(now.getTime() - PENDING_MIN_AGE_MS);

    const pendingPurchases = await prisma.purchase.findMany({
      where: {
        paymentStatus: "PENDING",
        gatewayTransactionId: { not: null },
        createdAt: { gte: pendingFrom, lte: pendingTo },
      },
      select: {
        id: true,
        gatewayAccount: true,
        gatewayTransactionId: true,
        paymentStatus: true,
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });

    // --- 2. EXPIRED purchases (up to 24h old) ---
    const expiredFrom = new Date(now.getTime() - EXPIRED_MAX_AGE_MS);

    const expiredPurchases = await prisma.purchase.findMany({
      where: {
        paymentStatus: "EXPIRED",
        gatewayTransactionId: { not: null },
        createdAt: { gte: expiredFrom },
      },
      select: {
        id: true,
        gatewayAccount: true,
        gatewayTransactionId: true,
        paymentStatus: true,
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });

    const allPurchases = [...pendingPurchases, ...expiredPurchases];
    if (allPurchases.length === 0) return;

    // Load gateway credentials once per account
    const masterConfig = await prisma.masterConfig.findFirst();
    if (!masterConfig) return;

    const clientCache = new Map<string, ParadiseClient>();

    const getClient = (gateway: string): ParadiseClient | null => {
      if (clientCache.has(gateway)) return clientCache.get(gateway)!;

      const rawCreds = gateway === "A"
        ? masterConfig.paradiseACredentials
        : masterConfig.paradiseBCredentials;

      if (!rawCreds) return null;

      try {
        const creds = JSON.parse(decrypt(rawCreds, encryptionKey));
        if (!creds.secretKey) return null;
        const client = new ParadiseClient({ secretKey: creds.secretKey });
        clientCache.set(gateway, client);
        return client;
      } catch {
        return null;
      }
    };

    const webhookService = new WebhookService(prisma);
    let confirmed = 0;
    let recoveredExpired = 0;
    let failed = 0;

    for (const purchase of allPurchases) {
      try {
        const client = getClient(purchase.gatewayAccount);
        if (!client || !purchase.gatewayTransactionId) continue;

        const result = await client.getTransactionStatus(purchase.gatewayTransactionId);

        if (result.status === "approved") {
          if (purchase.paymentStatus === "PENDING") {
            await webhookService.handlePaymentConfirmed(purchase.id);
            confirmed++;
          } else {
            // EXPIRED but actually paid — re-assign new numbers
            await webhookService.handleExpiredButPaid(purchase.id);
            recoveredExpired++;
          }
        } else if (
          purchase.paymentStatus === "PENDING" &&
          (result.status === "failed" || result.status === "refunded" || result.status === "expired")
        ) {
          await webhookService.handlePaymentFailed(purchase.id);
          failed++;
        }
        // still "pending" on gateway → do nothing, retry next cycle
      } catch {
        // Individual check failed — skip and try next cycle
      }
    }

    if (confirmed > 0 || recoveredExpired > 0 || failed > 0) {
      console.log(
        `[RECONCILE] Checked ${allPurchases.length} purchases — ` +
        `confirmed: ${confirmed}, recovered-expired: ${recoveredExpired}, failed: ${failed}`,
      );
    }
  } catch {
    // Silently ignore — tables may not exist yet on first deploy
  }
}

// Run every 2 minutes
setInterval(run, INTERVAL_MS);
// First run 30s after startup (let other init finish first)
setTimeout(run, 30_000);

export {};

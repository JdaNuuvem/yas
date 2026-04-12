# Sistema de Rifas (Projeto Yasmin) — Plano de Implementacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir plataforma de rifas digitais com 1M numeros, split oculto via 2 contas Paradise, sorteio controlado e 3 niveis de acesso (publico, admin, master).

**Architecture:** Monorepo com frontend Next.js e backend Node.js/Fastify separados. PostgreSQL como banco. Split oculto via round-robin entre 2 contas Paradise. Dashboard admin filtrado mostra apenas transacoes do Paradise B. Painel master oculto com visao real.

**Tech Stack:** Next.js 14 (App Router), Fastify, PostgreSQL, Prisma ORM, TailwindCSS, React Query, Framer Motion (sorteio), Paradise API, JWT auth, bcrypt, AES-256.

**Spec:** `docs/superpowers/specs/2026-04-12-rifa-system-design.md`

---

## File Structure

```
yasmin/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── server.ts                    # Fastify bootstrap
│   │   ├── config/
│   │   │   └── env.ts                   # Env vars + validation
│   │   ├── lib/
│   │   │   ├── prisma.ts                # Prisma client singleton
│   │   │   ├── crypto.ts                # AES-256 encrypt/decrypt
│   │   │   ├── jwt.ts                   # JWT sign/verify
│   │   │   └── paradise.ts              # Paradise API client
│   │   ├── modules/
│   │   │   ├── raffle/
│   │   │   │   ├── raffle.routes.ts     # GET /api/raffle
│   │   │   │   ├── raffle.service.ts    # Business logic
│   │   │   │   └── raffle.schema.ts     # Zod validation
│   │   │   ├── number/
│   │   │   │   ├── number.routes.ts     # GET /api/raffle/numbers
│   │   │   │   ├── number.service.ts    # Grid, busca, reserva
│   │   │   │   └── number.schema.ts
│   │   │   ├── purchase/
│   │   │   │   ├── purchase.routes.ts   # POST /api/purchase
│   │   │   │   ├── purchase.service.ts  # Compra + split logic
│   │   │   │   └── purchase.schema.ts
│   │   │   ├── webhook/
│   │   │   │   ├── webhook.routes.ts    # POST /api/webhook/paradise
│   │   │   │   └── webhook.service.ts   # Confirma pagamento
│   │   │   ├── draw/
│   │   │   │   ├── draw.routes.ts       # GET /api/draw/:position
│   │   │   │   └── draw.service.ts      # Sorteio controlado
│   │   │   ├── admin/
│   │   │   │   ├── admin.routes.ts      # /api/admin/*
│   │   │   │   ├── admin.service.ts     # Dashboard filtrado
│   │   │   │   └── admin.schema.ts
│   │   │   └── master/
│   │   │       ├── master.routes.ts     # /api/master/*
│   │   │       ├── master.service.ts    # Dashboard real + sorteio ctrl
│   │   │       └── master.schema.ts
│   │   └── middleware/
│   │       ├── auth.ts                  # JWT middleware (admin/master)
│   │       └── rate-limit.ts
│   └── tests/
│       ├── lib/
│       │   ├── crypto.test.ts
│       │   ├── paradise.test.ts
│       │   └── jwt.test.ts
│       ├── modules/
│       │   ├── purchase.service.test.ts # Split logic tests
│       │   ├── number.service.test.ts   # Reserva/concorrencia
│       │   ├── draw.service.test.ts     # Sorteio controlado
│       │   ├── admin.service.test.ts    # Filtragem dashboard
│       │   └── webhook.service.test.ts
│       └── setup.ts                     # Test helpers
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # Pagina publica da rifa
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx             # Checkout + PIX
│   │   │   ├── meus-numeros/
│   │   │   │   └── page.tsx             # Consulta por CPF/tel
│   │   │   ├── sorteio/
│   │   │   │   └── [position]/
│   │   │   │       └── page.tsx         # Tela de sorteio animada
│   │   │   ├── admin/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── layout.tsx           # Admin layout + sidebar
│   │   │   │   ├── page.tsx             # Dashboard filtrado
│   │   │   │   ├── configuracao/page.tsx
│   │   │   │   ├── premios/page.tsx
│   │   │   │   ├── compradores/page.tsx
│   │   │   │   └── sorteio/page.tsx
│   │   │   └── master/
│   │   │       ├── login/page.tsx
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx             # Dashboard real
│   │   │       ├── sorteio/page.tsx     # Definir numeros vencedores
│   │   │       ├── gateway/page.tsx     # Status Paradise A/B
│   │   │       └── config/page.tsx
│   │   ├── components/
│   │   │   ├── raffle/
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── NumberGrid.tsx       # Grid virtualizado 1M
│   │   │   │   ├── NumberCell.tsx
│   │   │   │   ├── PrizeList.tsx
│   │   │   │   ├── RecentBuyers.tsx
│   │   │   │   ├── TopBuyers.tsx
│   │   │   │   └── Cart.tsx
│   │   │   ├── checkout/
│   │   │   │   ├── BuyerForm.tsx
│   │   │   │   └── PixPayment.tsx
│   │   │   ├── draw/
│   │   │   │   ├── SlotMachine.tsx      # Animacao roleta
│   │   │   │   ├── Confetti.tsx
│   │   │   │   └── WinnerReveal.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── ProgressBar.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                   # Fetch wrapper
│   │   │   └── format.ts               # CPF mask, currency, etc
│   │   ├── hooks/
│   │   │   ├── useRaffle.ts
│   │   │   ├── useNumbers.ts
│   │   │   ├── useCart.ts
│   │   │   └── usePurchase.ts
│   │   └── types/
│   │       └── index.ts                 # Shared TypeScript types
│   └── tests/
│       ├── components/
│       │   ├── NumberGrid.test.tsx
│       │   └── SlotMachine.test.tsx
│       └── hooks/
│           └── useCart.test.ts
└── docker-compose.yml                   # Postgres local
```

---

## Phase 1: Project Setup + Database

### Task 1: Initialize Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/server.ts`
- Create: `backend/src/config/env.ts`

- [ ] **Step 1: Create backend directory and init**

```bash
mkdir -p backend && cd backend
npm init -y
npm install fastify @fastify/cors @fastify/jwt @fastify/rate-limit @prisma/client zod dotenv
npm install -D typescript @types/node tsx vitest prisma
npx tsc --init
```

- [ ] **Step 2: Configure tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create env config with validation**

```typescript
// backend/src/config/env.ts
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ENCRYPTION_KEY: z.string().length(64, "Must be 32 bytes hex"),
  PARADISE_A_API_KEY: z.string(),
  PARADISE_A_SECRET: z.string(),
  PARADISE_B_API_KEY: z.string(),
  PARADISE_B_SECRET: z.string(),
  PARADISE_WEBHOOK_SECRET: z.string(),
  MASTER_ROUTE_PREFIX: z.string().default("/api/master"),
  MASTER_ALLOWED_IPS: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

- [ ] **Step 4: Create Fastify server bootstrap**

```typescript
// backend/src/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";

export async function buildServer() {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });
  await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  server.get("/health", async () => ({ status: "ok" }));

  return server;
}

async function main() {
  const server = await buildServer();
  await server.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Add scripts to package.json**

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:run": "vitest run",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 6: Create .env.example**

```env
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/yasmin
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
PARADISE_A_API_KEY=pk_a_xxx
PARADISE_A_SECRET=sk_a_xxx
PARADISE_B_API_KEY=pk_b_xxx
PARADISE_B_SECRET=sk_b_xxx
PARADISE_WEBHOOK_SECRET=whsec_xxx
MASTER_ROUTE_PREFIX=/api/master
MASTER_ALLOWED_IPS=127.0.0.1
NODE_ENV=development
```

- [ ] **Step 7: Create docker-compose for Postgres**

```yaml
# docker-compose.yml (root)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: yasmin
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 8: Start Postgres and verify**

```bash
docker-compose up -d
# Expected: postgres container running on port 5432
```

- [ ] **Step 9: Commit**

```bash
git add backend/ docker-compose.yml
git commit -m "feat: initialize backend project with Fastify, env config, and Postgres"
```

---

### Task 2: Prisma Schema + Database

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: Write Prisma schema**

```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum RaffleStatus {
  DRAFT
  ACTIVE
  COMPLETED
}

enum NumberStatus {
  AVAILABLE
  RESERVED
  SOLD
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  FAILED
  EXPIRED
}

enum GatewayAccount {
  A
  B
}

enum UserRole {
  ADMIN
  MASTER
}

model Raffle {
  id           String       @id @default(cuid())
  name         String
  description  String       @default("")
  mainImageUrl String?      @map("main_image_url")
  themeColors  Json         @default("{\"primary\":\"#6366f1\",\"secondary\":\"#8b5cf6\",\"background\":\"#0f172a\"}") @map("theme_colors")
  logoUrl      String?      @map("logo_url")
  status       RaffleStatus @default(DRAFT)
  totalNumbers Int          @default(1000000) @map("total_numbers")
  numberPrice  Decimal      @default(0.20) @db.Decimal(10, 2) @map("number_price")
  minPurchase  Decimal      @default(5.00) @db.Decimal(10, 2) @map("min_purchase")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  numbers   Number[]
  prizes    Prize[]
  purchases Purchase[]

  @@map("raffles")
}

model Prize {
  id                   String   @id @default(cuid())
  raffleId             String   @map("raffle_id")
  position             Int      // 1-10
  name                 String
  description          String   @default("")
  imageUrl             String?  @map("image_url")
  winnerNumber         Int?     @map("winner_number")
  winnerBuyerId        String?  @map("winner_buyer_id")
  drawnAt              DateTime? @map("drawn_at")
  predeterminedNumber  String?  @map("predetermined_number") // encrypted

  raffle      Raffle @relation(fields: [raffleId], references: [id])
  winnerBuyer Buyer? @relation(fields: [winnerBuyerId], references: [id])

  @@unique([raffleId, position])
  @@map("prizes")
}

model Buyer {
  id        String   @id @default(cuid())
  name      String
  cpf       String   // encrypted
  phone     String
  email     String   @default("")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  numbers   Number[]
  purchases Purchase[]
  prizes    Prize[]

  @@map("buyers")
}

model Number {
  id          String       @id @default(cuid())
  raffleId    String       @map("raffle_id")
  numberValue Int          @map("number_value")
  status      NumberStatus @default(AVAILABLE)
  buyerId     String?      @map("buyer_id")
  purchaseId  String?      @map("purchase_id")
  reservedAt  DateTime?    @map("reserved_at")
  soldAt      DateTime?    @map("sold_at")

  raffle   Raffle    @relation(fields: [raffleId], references: [id])
  buyer    Buyer?    @relation(fields: [buyerId], references: [id])
  purchase Purchase? @relation(fields: [purchaseId], references: [id])

  @@unique([raffleId, numberValue])
  @@index([raffleId, status])
  @@index([buyerId])
  @@map("numbers")
}

model Purchase {
  id                   String         @id @default(cuid())
  raffleId             String         @map("raffle_id")
  buyerId              String         @map("buyer_id")
  quantity             Int
  totalAmount          Decimal        @db.Decimal(10, 2) @map("total_amount")
  gatewayAccount       GatewayAccount @map("gateway_account")
  gatewayTransactionId String?        @map("gateway_transaction_id")
  paymentStatus        PaymentStatus  @default(PENDING) @map("payment_status")
  pixQrCode            String?        @map("pix_qr_code")
  pixCopyPaste         String?        @map("pix_copy_paste")
  createdAt            DateTime       @default(now()) @map("created_at")
  confirmedAt          DateTime?      @map("confirmed_at")
  expiredAt            DateTime?      @map("expired_at")

  raffle  Raffle   @relation(fields: [raffleId], references: [id])
  buyer   Buyer    @relation(fields: [buyerId], references: [id])
  numbers Number[]

  @@index([raffleId, gatewayAccount])
  @@index([raffleId, paymentStatus])
  @@map("purchases")
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         UserRole @default(ADMIN)
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("admin_users")
}

model MasterConfig {
  id                    String         @id @default(cuid())
  splitPercentage       Int            @default(50) @map("split_percentage")
  paradiseACredentials  String         @map("paradise_a_credentials") // encrypted JSON
  paradiseBCredentials  String         @map("paradise_b_credentials") // encrypted JSON
  nextGateway           GatewayAccount @default(A) @map("next_gateway")
  updatedAt             DateTime       @updatedAt @map("updated_at")

  @@map("master_config")
}
```

- [ ] **Step 2: Run Prisma migration**

```bash
cd backend
npx prisma migrate dev --name init
```

Expected: Migration created, tables created in Postgres.

- [ ] **Step 3: Create seed script**

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@rifa.com" },
    update: {},
    create: {
      email: "admin@rifa.com",
      passwordHash: adminPassword,
      name: "Administrador",
      role: "ADMIN",
    },
  });

  // Create master user
  const masterPassword = await bcrypt.hash("master123", 10);
  await prisma.adminUser.upsert({
    where: { email: "master@rifa.com" },
    update: {},
    create: {
      email: "master@rifa.com",
      passwordHash: masterPassword,
      name: "Master",
      role: "MASTER",
    },
  });

  // Create master config
  await prisma.masterConfig.create({
    data: {
      splitPercentage: 50,
      paradiseACredentials: "PLACEHOLDER_ENCRYPT_LATER",
      paradiseBCredentials: "PLACEHOLDER_ENCRYPT_LATER",
      nextGateway: "A",
    },
  });

  console.log("Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Run seed**

```bash
npm install bcrypt && npm install -D @types/bcrypt
npx tsx prisma/seed.ts
```

Expected: "Seed complete"

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/
git commit -m "feat: add Prisma schema with all tables and seed script"
```

---

### Task 3: Core Libraries (Crypto, JWT, Prisma Client)

**Files:**
- Create: `backend/src/lib/prisma.ts`
- Create: `backend/src/lib/crypto.ts`
- Create: `backend/src/lib/jwt.ts`
- Test: `backend/tests/lib/crypto.test.ts`
- Test: `backend/tests/lib/jwt.test.ts`

- [ ] **Step 1: Write crypto test**

```typescript
// backend/tests/lib/crypto.test.ts
import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../../src/lib/crypto.js";

describe("crypto", () => {
  const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("encrypts and decrypts a string", () => {
    const plaintext = "847293";
    const encrypted = encrypt(plaintext, testKey);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(":"); // iv:ciphertext format

    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext", () => {
    const plaintext = "847293";
    const a = encrypt(plaintext, testKey);
    const b = encrypt(plaintext, testKey);
    expect(a).not.toBe(b); // different IVs
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("test", testKey);
    const tampered = encrypted.slice(0, -2) + "xx";
    expect(() => decrypt(tampered, testKey)).toThrow();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npx vitest run tests/lib/crypto.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement crypto**

```typescript
// backend/src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

export function decrypt(ciphertext: string, hexKey: string): string {
  const [ivHex, encryptedHex, tagHex] = ciphertext.split(":");
  const key = Buffer.from(hexKey, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/lib/crypto.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Create Prisma client singleton**

```typescript
// backend/src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 6: Create JWT helper**

```typescript
// backend/src/lib/jwt.ts
import { env } from "../config/env.js";
import jwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";

export async function registerJwt(server: FastifyInstance) {
  await server.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });
}

export interface JwtPayload {
  id: string;
  email: string;
  role: "ADMIN" | "MASTER";
}
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/ backend/tests/lib/
git commit -m "feat: add crypto (AES-256-GCM), JWT, and Prisma client libs"
```

---

## Phase 2: Backend — Payment + Split Logic

### Task 4: Paradise API Client

**Files:**
- Create: `backend/src/lib/paradise.ts`
- Test: `backend/tests/lib/paradise.test.ts`

- [ ] **Step 1: Write Paradise client test**

```typescript
// backend/tests/lib/paradise.test.ts
import { describe, it, expect, vi } from "vitest";
import { ParadiseClient } from "../../src/lib/paradise.js";

describe("ParadiseClient", () => {
  it("creates a PIX charge with correct params", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: "txn_123",
        qr_code: "00020126...",
        qr_code_text: "00020126580014br.gov.bcb...",
      }),
    });

    const client = new ParadiseClient({
      apiKey: "pk_test",
      secretKey: "sk_test",
      fetchFn: mockFetch,
    });

    const result = await client.createPixCharge({
      amount: 1000, // R$10.00 in cents
      description: "Rifa - 50 numeros",
      externalRef: "purchase_abc",
    });

    expect(result.id).toBe("txn_123");
    expect(result.qrCode).toBe("00020126...");
    expect(result.qrCodeText).toBe("00020126580014br.gov.bcb...");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/charges"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("sk_test"),
        }),
      }),
    );
  });

  it("throws on API error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Invalid amount" }),
    });

    const client = new ParadiseClient({
      apiKey: "pk_test",
      secretKey: "sk_test",
      fetchFn: mockFetch,
    });

    await expect(
      client.createPixCharge({ amount: 0, description: "test", externalRef: "x" }),
    ).rejects.toThrow("Paradise API error");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/lib/paradise.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Paradise client**

```typescript
// backend/src/lib/paradise.ts
interface ParadiseConfig {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

interface CreatePixChargeInput {
  amount: number; // cents
  description: string;
  externalRef: string;
}

interface PixChargeResult {
  id: string;
  qrCode: string;
  qrCodeText: string;
}

export class ParadiseClient {
  private readonly config: Required<ParadiseConfig>;

  constructor(config: ParadiseConfig) {
    this.config = {
      baseUrl: "https://api.paradise.com/v1",
      fetchFn: globalThis.fetch,
      ...config,
    };
  }

  async createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResult> {
    const response = await this.config.fetchFn(`${this.config.baseUrl}/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.secretKey}`,
      },
      body: JSON.stringify({
        amount: input.amount,
        payment_method: "pix",
        description: input.description,
        external_reference: input.externalRef,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Paradise API error (${response.status}): ${err.error ?? "Unknown"}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      qrCode: data.qr_code,
      qrCodeText: data.qr_code_text,
    };
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/lib/paradise.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/paradise.ts backend/tests/lib/paradise.test.ts
git commit -m "feat: add Paradise API client with PIX charge support"
```

---

### Task 5: Purchase Service — Split Logic (Core)

**Files:**
- Create: `backend/src/modules/purchase/purchase.service.ts`
- Test: `backend/tests/modules/purchase.service.test.ts`

- [ ] **Step 1: Write split logic test**

```typescript
// backend/tests/modules/purchase.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PurchaseService } from "../../src/modules/purchase/purchase.service.js";

function createMockDeps() {
  return {
    prisma: {
      masterConfig: {
        findFirstOrThrow: vi.fn().mockResolvedValue({ id: "mc1", nextGateway: "A" }),
        update: vi.fn().mockResolvedValue({}),
      },
      number: {
        updateMany: vi.fn().mockResolvedValue({ count: 25 }),
        findMany: vi.fn().mockResolvedValue(
          Array.from({ length: 25 }, (_, i) => ({
            id: `n${i}`,
            numberValue: i + 1,
            status: "AVAILABLE",
          })),
        ),
        count: vi.fn().mockResolvedValue(25),
      },
      purchase: {
        create: vi.fn().mockResolvedValue({ id: "p1", gatewayAccount: "A" }),
      },
      buyer: {
        upsert: vi.fn().mockResolvedValue({ id: "b1" }),
      },
      $transaction: vi.fn((fn: any) => fn({
        number: {
          updateMany: vi.fn().mockResolvedValue({ count: 25 }),
        },
        purchase: {
          create: vi.fn().mockResolvedValue({ id: "p1", gatewayAccount: "A" }),
        },
      })),
    },
    paradiseA: { createPixCharge: vi.fn().mockResolvedValue({ id: "txn_a", qrCode: "qr_a", qrCodeText: "text_a" }) },
    paradiseB: { createPixCharge: vi.fn().mockResolvedValue({ id: "txn_b", qrCode: "qr_b", qrCodeText: "text_b" }) },
  };
}

describe("PurchaseService", () => {
  it("routes first purchase to gateway A and flips to B", async () => {
    const deps = createMockDeps();
    const service = new PurchaseService(deps.prisma as any, deps.paradiseA as any, deps.paradiseB as any);

    const result = await service.createPurchase({
      raffleId: "r1",
      buyerName: "Joao",
      buyerCpf: "12345678901",
      buyerPhone: "11999999999",
      buyerEmail: "joao@test.com",
      numberValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    });

    // Should use Paradise A (current nextGateway)
    expect(deps.paradiseA.createPixCharge).toHaveBeenCalledOnce();
    expect(deps.paradiseB.createPixCharge).not.toHaveBeenCalled();

    // Should flip nextGateway to B
    expect(deps.prisma.masterConfig.update).toHaveBeenCalledWith({
      where: { id: "mc1" },
      data: { nextGateway: "B" },
    });
  });

  it("routes to gateway B when nextGateway is B", async () => {
    const deps = createMockDeps();
    deps.prisma.masterConfig.findFirstOrThrow.mockResolvedValue({ id: "mc1", nextGateway: "B" });

    const service = new PurchaseService(deps.prisma as any, deps.paradiseA as any, deps.paradiseB as any);

    await service.createPurchase({
      raffleId: "r1",
      buyerName: "Maria",
      buyerCpf: "98765432100",
      buyerPhone: "11888888888",
      buyerEmail: "",
      numberValues: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124],
    });

    expect(deps.paradiseB.createPixCharge).toHaveBeenCalledOnce();
    expect(deps.paradiseA.createPixCharge).not.toHaveBeenCalled();

    // Should flip to A
    expect(deps.prisma.masterConfig.update).toHaveBeenCalledWith({
      where: { id: "mc1" },
      data: { nextGateway: "A" },
    });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/modules/purchase.service.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement PurchaseService**

```typescript
// backend/src/modules/purchase/purchase.service.ts
import type { PrismaClient, GatewayAccount } from "@prisma/client";
import type { ParadiseClient } from "../../lib/paradise.js";
import { encrypt } from "../../lib/crypto.js";
import { env } from "../../config/env.js";

interface CreatePurchaseInput {
  raffleId: string;
  buyerName: string;
  buyerCpf: string;
  buyerPhone: string;
  buyerEmail: string;
  numberValues: number[];
}

export class PurchaseService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly paradiseA: ParadiseClient,
    private readonly paradiseB: ParadiseClient,
  ) {}

  async createPurchase(input: CreatePurchaseInput) {
    const quantity = input.numberValues.length;
    const totalAmountCents = quantity * 20; // R$0.20 = 20 centavos

    // 1. Determine gateway (round-robin)
    const config = await this.prisma.masterConfig.findFirstOrThrow();
    const gateway: GatewayAccount = config.nextGateway;
    const paradiseClient = gateway === "A" ? this.paradiseA : this.paradiseB;

    // 2. Upsert buyer
    const encryptedCpf = encrypt(input.buyerCpf, env.ENCRYPTION_KEY);
    const buyer = await this.prisma.buyer.upsert({
      where: { id: input.buyerCpf }, // will use cpf lookup in real impl
      update: { name: input.buyerName, phone: input.buyerPhone, email: input.buyerEmail },
      create: {
        name: input.buyerName,
        cpf: encryptedCpf,
        phone: input.buyerPhone,
        email: input.buyerEmail,
      },
    });

    // 3. Reserve numbers + create purchase in transaction
    const purchase = await this.prisma.$transaction(async (tx) => {
      const reserved = await tx.number.updateMany({
        where: {
          raffleId: input.raffleId,
          numberValue: { in: input.numberValues },
          status: "AVAILABLE",
        },
        data: { status: "RESERVED", reservedAt: new Date(), buyerId: buyer.id },
      });

      if (reserved.count !== quantity) {
        throw new Error(`Only ${reserved.count} of ${quantity} numbers available`);
      }

      return tx.purchase.create({
        data: {
          raffleId: input.raffleId,
          buyerId: buyer.id,
          quantity,
          totalAmount: totalAmountCents / 100,
          gatewayAccount: gateway,
          paymentStatus: "PENDING",
        },
      });
    });

    // 4. Create PIX charge
    const charge = await paradiseClient.createPixCharge({
      amount: totalAmountCents,
      description: `Rifa - ${quantity} numeros`,
      externalRef: purchase.id,
    });

    // 5. Update purchase with charge data
    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        gatewayTransactionId: charge.id,
        pixQrCode: charge.qrCode,
        pixCopyPaste: charge.qrCodeText,
      },
    });

    // 6. Flip gateway for next purchase
    await this.prisma.masterConfig.update({
      where: { id: config.id },
      data: { nextGateway: gateway === "A" ? "B" : "A" },
    });

    return {
      purchaseId: purchase.id,
      qrCode: charge.qrCode,
      qrCodeText: charge.qrCodeText,
      quantity,
      totalAmount: totalAmountCents / 100,
    };
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run tests/modules/purchase.service.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/purchase/ backend/tests/modules/purchase.service.test.ts
git commit -m "feat: add purchase service with split round-robin logic"
```

---

### Task 6: Webhook Service — Payment Confirmation

**Files:**
- Create: `backend/src/modules/webhook/webhook.service.ts`
- Create: `backend/src/modules/webhook/webhook.routes.ts`
- Test: `backend/tests/modules/webhook.service.test.ts`

- [ ] **Step 1: Write webhook test**

```typescript
// backend/tests/modules/webhook.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { WebhookService } from "../../src/modules/webhook/webhook.service.js";

describe("WebhookService", () => {
  it("confirms purchase and marks numbers as sold", async () => {
    const mockPrisma = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "p1",
          paymentStatus: "PENDING",
          buyerId: "b1",
          raffleId: "r1",
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      number: {
        updateMany: vi.fn().mockResolvedValue({ count: 25 }),
      },
      $transaction: vi.fn(async (fn: any) => fn(mockPrisma)),
    };

    const service = new WebhookService(mockPrisma as any);

    await service.handlePaymentConfirmed("p1");

    expect(mockPrisma.purchase.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ paymentStatus: "CONFIRMED" }),
    });

    expect(mockPrisma.number.updateMany).toHaveBeenCalledWith({
      where: { purchaseId: "p1", status: "RESERVED" },
      data: expect.objectContaining({ status: "SOLD" }),
    });
  });

  it("ignores already confirmed purchases", async () => {
    const mockPrisma = {
      purchase: {
        findUnique: vi.fn().mockResolvedValue({
          id: "p1",
          paymentStatus: "CONFIRMED",
        }),
        update: vi.fn(),
      },
    };

    const service = new WebhookService(mockPrisma as any);
    await service.handlePaymentConfirmed("p1");

    expect(mockPrisma.purchase.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/modules/webhook.service.test.ts
```

- [ ] **Step 3: Implement WebhookService**

```typescript
// backend/src/modules/webhook/webhook.service.ts
import type { PrismaClient } from "@prisma/client";

export class WebhookService {
  constructor(private readonly prisma: PrismaClient) {}

  async handlePaymentConfirmed(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase || purchase.paymentStatus === "CONFIRMED") {
      return; // idempotent
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: "CONFIRMED", confirmedAt: new Date() },
      });

      await tx.number.updateMany({
        where: { purchaseId, status: "RESERVED" },
        data: { status: "SOLD", soldAt: new Date() },
      });
    });
  }

  async handlePaymentFailed(purchaseId: string): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase || purchase.paymentStatus !== "PENDING") {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: "FAILED" },
      });

      await tx.number.updateMany({
        where: { purchaseId, status: "RESERVED" },
        data: { status: "AVAILABLE", buyerId: null, purchaseId: null, reservedAt: null },
      });
    });
  }
}
```

- [ ] **Step 4: Create webhook route**

```typescript
// backend/src/modules/webhook/webhook.routes.ts
import type { FastifyInstance } from "fastify";
import { WebhookService } from "./webhook.service.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import crypto from "node:crypto";

export async function webhookRoutes(server: FastifyInstance) {
  const service = new WebhookService(prisma);

  server.post("/api/webhook/paradise", async (request, reply) => {
    // Verify signature
    const signature = request.headers["x-paradise-signature"] as string;
    const body = JSON.stringify(request.body);
    const expected = crypto
      .createHmac("sha256", env.PARADISE_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expected) {
      return reply.status(401).send({ error: "Invalid signature" });
    }

    const payload = request.body as { event: string; data: { external_reference: string } };

    if (payload.event === "charge.confirmed") {
      await service.handlePaymentConfirmed(payload.data.external_reference);
    } else if (payload.event === "charge.failed") {
      await service.handlePaymentFailed(payload.data.external_reference);
    }

    return reply.status(200).send({ received: true });
  });
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx vitest run tests/modules/webhook.service.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/webhook/ backend/tests/modules/webhook.service.test.ts
git commit -m "feat: add webhook service for Paradise payment confirmation"
```

---

### Task 7: Number Service — Grid, Reserva, Expiracao

**Files:**
- Create: `backend/src/modules/number/number.service.ts`
- Create: `backend/src/modules/number/number.routes.ts`
- Create: `backend/src/modules/number/number.schema.ts`
- Test: `backend/tests/modules/number.service.test.ts`

- [ ] **Step 1: Write number service test**

```typescript
// backend/tests/modules/number.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { NumberService } from "../../src/modules/number/number.service.js";

describe("NumberService", () => {
  it("returns paginated numbers with correct offset", async () => {
    const mockNumbers = Array.from({ length: 1000 }, (_, i) => ({
      numberValue: i + 1,
      status: "AVAILABLE",
      buyerId: null,
    }));

    const mockPrisma = {
      number: {
        findMany: vi.fn().mockResolvedValue(mockNumbers),
        count: vi.fn().mockResolvedValue(1000000),
      },
    };

    const service = new NumberService(mockPrisma as any);
    const result = await service.getNumbers("r1", { page: 1, limit: 1000 });

    expect(result.numbers).toHaveLength(1000);
    expect(result.total).toBe(1000000);
    expect(mockPrisma.number.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 1000,
        orderBy: { numberValue: "asc" },
      }),
    );
  });

  it("returns random available numbers", async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({ number_value: i * 100 + 1 })),
      ),
    };

    const service = new NumberService(mockPrisma as any);
    const result = await service.getRandomAvailable("r1", 25);

    expect(result).toHaveLength(25);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/modules/number.service.test.ts
```

- [ ] **Step 3: Implement NumberService**

```typescript
// backend/src/modules/number/number.service.ts
import type { PrismaClient } from "@prisma/client";

interface GetNumbersOptions {
  page: number;
  limit: number;
  status?: "AVAILABLE" | "SOLD" | "RESERVED";
  buyerId?: string;
}

export class NumberService {
  constructor(private readonly prisma: PrismaClient) {}

  async getNumbers(raffleId: string, options: GetNumbersOptions) {
    const { page, limit, status, buyerId } = options;
    const skip = (page - 1) * limit;

    const where = {
      raffleId,
      ...(status ? { status } : {}),
      ...(buyerId ? { buyerId } : {}),
    };

    const [numbers, total] = await Promise.all([
      this.prisma.number.findMany({
        where,
        select: { numberValue: true, status: true, buyerId: true },
        orderBy: { numberValue: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.number.count({ where }),
    ]);

    return { numbers, total, page, limit };
  }

  async getRandomAvailable(raffleId: string, quantity: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ number_value: number }[]>`
      SELECT number_value FROM numbers
      WHERE raffle_id = ${raffleId} AND status = 'AVAILABLE'
      ORDER BY RANDOM()
      LIMIT ${quantity}
    `;

    return rows.map((r) => r.number_value);
  }

  async searchNumber(raffleId: string, numberValue: number) {
    return this.prisma.number.findUnique({
      where: { raffleId_numberValue: { raffleId, numberValue } },
      select: { numberValue: true, status: true, buyerId: true },
    });
  }

  async expireReservations(): Promise<number> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const result = await this.prisma.number.updateMany({
      where: {
        status: "RESERVED",
        reservedAt: { lt: fifteenMinutesAgo },
      },
      data: { status: "AVAILABLE", buyerId: null, purchaseId: null, reservedAt: null },
    });

    return result.count;
  }
}
```

- [ ] **Step 4: Create Zod schema**

```typescript
// backend/src/modules/number/number.schema.ts
import { z } from "zod";

export const getNumbersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(100).max(5000).default(1000),
  status: z.enum(["AVAILABLE", "SOLD", "RESERVED"]).optional(),
});

export const searchNumberSchema = z.object({
  q: z.coerce.number().int().min(1).max(1000000),
});

export const randomNumbersSchema = z.object({
  quantity: z.coerce.number().int().min(25).max(5000),
});
```

- [ ] **Step 5: Create routes**

```typescript
// backend/src/modules/number/number.routes.ts
import type { FastifyInstance } from "fastify";
import { NumberService } from "./number.service.js";
import { getNumbersSchema, searchNumberSchema, randomNumbersSchema } from "./number.schema.js";
import { prisma } from "../../lib/prisma.js";

export async function numberRoutes(server: FastifyInstance) {
  const service = new NumberService(prisma);

  server.get("/api/raffle/:raffleId/numbers", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    const query = getNumbersSchema.parse(request.query);
    return service.getNumbers(raffleId, query);
  });

  server.get("/api/raffle/:raffleId/numbers/search", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    const { q } = searchNumberSchema.parse(request.query);
    return service.searchNumber(raffleId, q);
  });

  server.get("/api/raffle/:raffleId/numbers/random", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    const { quantity } = randomNumbersSchema.parse(request.query);
    return service.getRandomAvailable(raffleId, quantity);
  });
}
```

- [ ] **Step 6: Run test — verify it passes**

```bash
npx vitest run tests/modules/number.service.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/number/ backend/tests/modules/number.service.test.ts
git commit -m "feat: add number service with pagination, random selection, reservation expiry"
```

---

### Task 8: Admin Service — Dashboard Filtrado

**Files:**
- Create: `backend/src/modules/admin/admin.service.ts`
- Create: `backend/src/modules/admin/admin.routes.ts`
- Create: `backend/src/modules/admin/admin.schema.ts`
- Create: `backend/src/middleware/auth.ts`
- Test: `backend/tests/modules/admin.service.test.ts`

- [ ] **Step 1: Write admin dashboard test — CRITICAL: verifica filtragem por Gateway B**

```typescript
// backend/tests/modules/admin.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { AdminService } from "../../src/modules/admin/admin.service.js";

describe("AdminService", () => {
  it("returns dashboard data filtered by gateway B only", async () => {
    const mockPrisma = {
      number: {
        count: vi.fn()
          .mockResolvedValueOnce(5000) // total sold (both gateways)
          .mockResolvedValueOnce(2500), // sold via gateway B
      },
      purchase: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { totalAmount: 500 }, // R$500 via gateway B
          _count: { id: 50 },
        }),
        findMany: vi.fn().mockResolvedValue([
          { id: "p1", quantity: 25, totalAmount: 5, createdAt: new Date(), buyer: { name: "Joao" } },
        ]),
      },
    };

    const service = new AdminService(mockPrisma as any);
    const dashboard = await service.getDashboard("r1");

    // CRITICAL: The aggregate call MUST filter by gatewayAccount B
    expect(mockPrisma.purchase.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          raffleId: "r1",
          gatewayAccount: "B",
          paymentStatus: "CONFIRMED",
        }),
      }),
    );

    expect(dashboard.totalSold).toBeDefined();
    expect(dashboard.totalRevenue).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/modules/admin.service.test.ts
```

- [ ] **Step 3: Implement AdminService**

```typescript
// backend/src/modules/admin/admin.service.ts
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

// IMPORTANT: All queries filter by gatewayAccount = "B"
// The admin (dono) must only see transactions from Paradise B.
// This is the core of the split concealment.
const VISIBLE_GATEWAY = "B" as const;

export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboard(raffleId: string) {
    const [stats, recentPurchases] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: {
          raffleId,
          gatewayAccount: VISIBLE_GATEWAY,
          paymentStatus: "CONFIRMED",
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchase.findMany({
        where: {
          raffleId,
          gatewayAccount: VISIBLE_GATEWAY,
          paymentStatus: "CONFIRMED",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { buyer: { select: { name: true } } },
      }),
    ]);

    // Count sold numbers ONLY from gateway B purchases
    const soldCount = await this.prisma.number.count({
      where: {
        raffleId,
        status: "SOLD",
        purchase: { gatewayAccount: VISIBLE_GATEWAY },
      },
    });

    return {
      totalSold: soldCount,
      totalRevenue: stats._sum.totalAmount ?? 0,
      totalPurchases: stats._count.id,
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        buyerName: p.buyer.name,
        quantity: p.quantity,
        totalAmount: p.totalAmount,
        createdAt: p.createdAt,
      })),
    };
  }

  async getBuyers(raffleId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [buyers, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where: {
          raffleId,
          gatewayAccount: VISIBLE_GATEWAY,
          paymentStatus: "CONFIRMED",
        },
        include: {
          buyer: { select: { name: true, phone: true, email: true } },
          numbers: { select: { numberValue: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.purchase.count({
        where: {
          raffleId,
          gatewayAccount: VISIBLE_GATEWAY,
          paymentStatus: "CONFIRMED",
        },
      }),
    ]);

    return { buyers, total, page, limit };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user || user.role !== "ADMIN") {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
```

- [ ] **Step 4: Create auth middleware**

```typescript
// backend/src/middleware/auth.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import type { JwtPayload } from "../lib/jwt.js";

export async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    if (decoded.role !== "ADMIN" && decoded.role !== "MASTER") {
      return reply.status(403).send({ error: "Forbidden" });
    }
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function masterAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    if (decoded.role !== "MASTER") {
      return reply.status(403).send({ error: "Forbidden" });
    }
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
```

- [ ] **Step 5: Create admin routes**

```typescript
// backend/src/modules/admin/admin.routes.ts
import type { FastifyInstance } from "fastify";
import { AdminService } from "./admin.service.js";
import { prisma } from "../../lib/prisma.js";
import { adminAuth } from "../../middleware/auth.js";
import { z } from "zod";

export async function adminRoutes(server: FastifyInstance) {
  const service = new AdminService(prisma);

  server.post("/api/admin/login", async (request, reply) => {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(request.body);

    const user = await service.login(email, password);
    const token = server.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user };
  });

  server.get("/api/admin/dashboard", { preHandler: [adminAuth] }, async (request) => {
    const { raffleId } = z.object({ raffleId: z.string() }).parse(request.query);
    return service.getDashboard(raffleId);
  });

  server.get("/api/admin/buyers", { preHandler: [adminAuth] }, async (request) => {
    const query = z.object({
      raffleId: z.string(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().default(20),
    }).parse(request.query);
    return service.getBuyers(query.raffleId, query.page, query.limit);
  });
}
```

- [ ] **Step 6: Run test — verify it passes**

```bash
npx vitest run tests/modules/admin.service.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/admin/ backend/src/middleware/ backend/tests/modules/admin.service.test.ts
git commit -m "feat: add admin service with dashboard filtered by gateway B (split concealment)"
```

---

### Task 9: Master Service — Dashboard Real + Sorteio Controlado

**Files:**
- Create: `backend/src/modules/master/master.service.ts`
- Create: `backend/src/modules/master/master.routes.ts`
- Create: `backend/src/modules/draw/draw.service.ts`
- Create: `backend/src/modules/draw/draw.routes.ts`
- Test: `backend/tests/modules/draw.service.test.ts`

- [ ] **Step 1: Write draw service test**

```typescript
// backend/tests/modules/draw.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { DrawService } from "../../src/modules/draw/draw.service.js";

describe("DrawService", () => {
  it("sets predetermined winner number (encrypted)", async () => {
    const mockPrisma = {
      prize: {
        update: vi.fn().mockResolvedValue({ id: "pr1", position: 1 }),
      },
    };

    const service = new DrawService(mockPrisma as any);
    await service.setPredeterminedWinner("r1", 1, 847293);

    expect(mockPrisma.prize.update).toHaveBeenCalledWith({
      where: { raffleId_position: { raffleId: "r1", position: 1 } },
      data: { predeterminedNumber: expect.any(String) }, // encrypted
    });
  });

  it("executes draw and returns predetermined number", async () => {
    const mockPrisma = {
      prize: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "pr1",
          position: 1,
          predeterminedNumber: "ENCRYPTED_847293",
          winnerNumber: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      number: {
        findUnique: vi.fn().mockResolvedValue({
          numberValue: 847293,
          buyerId: "b1",
          buyer: { name: "Joao", phone: "11999999999" },
        }),
      },
    };

    // Mock decrypt to return the number
    const service = new DrawService(mockPrisma as any);
    service.decryptNumber = vi.fn().mockReturnValue("847293");

    const result = await service.executeDraw("r1", 1);

    expect(result.winnerNumber).toBe(847293);
    expect(result.winnerName).toBe("Joao");
  });

  it("throws if no predetermined number set", async () => {
    const mockPrisma = {
      prize: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "pr1",
          position: 1,
          predeterminedNumber: null,
          winnerNumber: null,
        }),
      },
    };

    const service = new DrawService(mockPrisma as any);
    await expect(service.executeDraw("r1", 1)).rejects.toThrow("No predetermined number");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run tests/modules/draw.service.test.ts
```

- [ ] **Step 3: Implement DrawService**

```typescript
// backend/src/modules/draw/draw.service.ts
import type { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { env } from "../../config/env.js";

export class DrawService {
  constructor(private readonly prisma: PrismaClient) {}

  decryptNumber(encrypted: string): string {
    return decrypt(encrypted, env.ENCRYPTION_KEY);
  }

  async setPredeterminedWinner(raffleId: string, position: number, numberValue: number) {
    const encrypted = encrypt(String(numberValue), env.ENCRYPTION_KEY);

    await this.prisma.prize.update({
      where: { raffleId_position: { raffleId, position } },
      data: { predeterminedNumber: encrypted },
    });
  }

  async executeDraw(raffleId: string, position: number) {
    const prize = await this.prisma.prize.findUniqueOrThrow({
      where: { raffleId_position: { raffleId, position } },
    });

    if (prize.winnerNumber) {
      throw new Error("Draw already executed for this position");
    }

    if (!prize.predeterminedNumber) {
      throw new Error("No predetermined number set for this position");
    }

    const winnerNumber = parseInt(this.decryptNumber(prize.predeterminedNumber), 10);

    const numberRecord = await this.prisma.number.findUnique({
      where: { raffleId_numberValue: { raffleId, numberValue: winnerNumber } },
      include: { buyer: { select: { id: true, name: true, phone: true } } },
    });

    await this.prisma.prize.update({
      where: { raffleId_position: { raffleId, position } },
      data: {
        winnerNumber,
        winnerBuyerId: numberRecord?.buyer?.id ?? null,
        drawnAt: new Date(),
      },
    });

    return {
      position,
      winnerNumber,
      winnerName: numberRecord?.buyer?.name ?? "Numero nao vendido",
      winnerPhone: numberRecord?.buyer?.phone ?? null,
      prizeName: prize.name,
    };
  }

  async getDrawData(raffleId: string, position: number) {
    const prize = await this.prisma.prize.findUniqueOrThrow({
      where: { raffleId_position: { raffleId, position } },
      include: { winnerBuyer: { select: { name: true } } },
    });

    if (!prize.winnerNumber) {
      return { position, status: "pending", prizeName: prize.name };
    }

    return {
      position,
      status: "drawn",
      winnerNumber: prize.winnerNumber,
      winnerName: prize.winnerBuyer?.name ?? "Numero nao vendido",
      prizeName: prize.name,
    };
  }
}
```

- [ ] **Step 4: Implement MasterService**

```typescript
// backend/src/modules/master/master.service.ts
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

export class MasterService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboard(raffleId: string) {
    const [statsAll, statsA, statsB] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: { raffleId, paymentStatus: "CONFIRMED" },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchase.aggregate({
        where: { raffleId, paymentStatus: "CONFIRMED", gatewayAccount: "A" },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchase.aggregate({
        where: { raffleId, paymentStatus: "CONFIRMED", gatewayAccount: "B" },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const totalSold = await this.prisma.number.count({
      where: { raffleId, status: "SOLD" },
    });

    return {
      totalSold,
      totalRevenue: statsAll._sum.totalAmount ?? 0,
      totalPurchases: statsAll._count.id,
      split: {
        ours: { revenue: statsA._sum.totalAmount ?? 0, purchases: statsA._count.id },
        owner: { revenue: statsB._sum.totalAmount ?? 0, purchases: statsB._count.id },
      },
    };
  }

  async getGatewayStatus() {
    const config = await this.prisma.masterConfig.findFirstOrThrow();
    return {
      nextGateway: config.nextGateway,
      splitPercentage: config.splitPercentage,
    };
  }

  async overrideNextGateway(gateway: "A" | "B") {
    const config = await this.prisma.masterConfig.findFirstOrThrow();
    return this.prisma.masterConfig.update({
      where: { id: config.id },
      data: { nextGateway: gateway },
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!user || user.role !== "MASTER") {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
```

- [ ] **Step 5: Create master and draw routes**

```typescript
// backend/src/modules/master/master.routes.ts
import type { FastifyInstance } from "fastify";
import { MasterService } from "./master.service.js";
import { DrawService } from "../draw/draw.service.js";
import { prisma } from "../../lib/prisma.js";
import { masterAuth } from "../../middleware/auth.js";
import { z } from "zod";

export async function masterRoutes(server: FastifyInstance) {
  const masterService = new MasterService(prisma);
  const drawService = new DrawService(prisma);

  server.post("/api/master/login", async (request) => {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string(),
    }).parse(request.body);

    const user = await masterService.login(email, password);
    const token = server.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user };
  });

  server.get("/api/master/dashboard", { preHandler: [masterAuth] }, async (request) => {
    const { raffleId } = z.object({ raffleId: z.string() }).parse(request.query);
    return masterService.getDashboard(raffleId);
  });

  server.get("/api/master/gateway/status", { preHandler: [masterAuth] }, async () => {
    return masterService.getGatewayStatus();
  });

  server.put("/api/master/gateway/override", { preHandler: [masterAuth] }, async (request) => {
    const { gateway } = z.object({ gateway: z.enum(["A", "B"]) }).parse(request.body);
    return masterService.overrideNextGateway(gateway);
  });

  server.put("/api/master/draw/:position/set", { preHandler: [masterAuth] }, async (request) => {
    const { raffleId, numberValue } = z.object({
      raffleId: z.string(),
      numberValue: z.number().int().min(1).max(1000000),
    }).parse(request.body);
    const { position } = z.object({ position: z.coerce.number().int().min(1).max(10) }).parse(request.params);

    await drawService.setPredeterminedWinner(raffleId, position, numberValue);
    return { success: true };
  });
}
```

```typescript
// backend/src/modules/draw/draw.routes.ts
import type { FastifyInstance } from "fastify";
import { DrawService } from "./draw.service.js";
import { prisma } from "../../lib/prisma.js";
import { adminAuth } from "../../middleware/auth.js";
import { z } from "zod";

export async function drawRoutes(server: FastifyInstance) {
  const service = new DrawService(prisma);

  // Public: get draw data for animation
  server.get("/api/draw/:position", async (request) => {
    const { position } = z.object({ position: z.coerce.number().int().min(1).max(10) }).parse(request.params);
    const { raffleId } = z.object({ raffleId: z.string() }).parse(request.query);
    return service.getDrawData(raffleId, position);
  });

  // Admin: trigger draw (the admin thinks it's random)
  server.post("/api/admin/draw/:position", { preHandler: [adminAuth] }, async (request) => {
    const { position } = z.object({ position: z.coerce.number().int().min(1).max(10) }).parse(request.params);
    const { raffleId } = z.object({ raffleId: z.string() }).parse(request.body);
    return service.executeDraw(raffleId, position);
  });
}
```

- [ ] **Step 6: Run test — verify it passes**

```bash
npx vitest run tests/modules/draw.service.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/master/ backend/src/modules/draw/ backend/tests/modules/draw.service.test.ts
git commit -m "feat: add master dashboard (real data), draw service (controlled raffle)"
```

---

### Task 10: Wire Up All Backend Routes

**Files:**
- Modify: `backend/src/server.ts`
- Create: `backend/src/modules/raffle/raffle.routes.ts`
- Create: `backend/src/modules/raffle/raffle.service.ts`
- Create: `backend/src/modules/purchase/purchase.routes.ts`
- Create: `backend/src/modules/purchase/purchase.schema.ts`

- [ ] **Step 1: Create raffle service and routes**

```typescript
// backend/src/modules/raffle/raffle.service.ts
import type { PrismaClient } from "@prisma/client";

export class RaffleService {
  constructor(private readonly prisma: PrismaClient) {}

  async getActive() {
    return this.prisma.raffle.findFirst({
      where: { status: "ACTIVE" },
      include: {
        prizes: { orderBy: { position: "asc" } },
      },
    });
  }

  async update(raffleId: string, data: { name?: string; description?: string; mainImageUrl?: string; themeColors?: object; logoUrl?: string }) {
    return this.prisma.raffle.update({
      where: { id: raffleId },
      data,
    });
  }

  async getRecentBuyers(raffleId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { raffleId, paymentStatus: "CONFIRMED" },
      orderBy: { confirmedAt: "desc" },
      take: 20,
      include: { buyer: { select: { name: true } } },
    });

    return purchases.map((p) => ({
      name: p.buyer.name.split(" ")[0] + "***",
      quantity: p.quantity,
      createdAt: p.confirmedAt,
    }));
  }

  async getTopBuyers(raffleId: string) {
    const buyers = await this.prisma.purchase.groupBy({
      by: ["buyerId"],
      where: { raffleId, paymentStatus: "CONFIRMED" },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });

    const buyerDetails = await this.prisma.buyer.findMany({
      where: { id: { in: buyers.map((b) => b.buyerId) } },
      select: { id: true, name: true },
    });

    const nameMap = new Map(buyerDetails.map((b) => [b.id, b.name]));

    return buyers.map((b) => ({
      name: nameMap.get(b.buyerId)?.split(" ")[0] + "***",
      totalNumbers: b._sum.quantity,
    }));
  }
}
```

```typescript
// backend/src/modules/raffle/raffle.routes.ts
import type { FastifyInstance } from "fastify";
import { RaffleService } from "./raffle.service.js";
import { prisma } from "../../lib/prisma.js";
import { adminAuth } from "../../middleware/auth.js";

export async function raffleRoutes(server: FastifyInstance) {
  const service = new RaffleService(prisma);

  server.get("/api/raffle", async () => service.getActive());
  server.get("/api/raffle/:raffleId/buyers/recent", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    return service.getRecentBuyers(raffleId);
  });
  server.get("/api/raffle/:raffleId/buyers/top", async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    return service.getTopBuyers(raffleId);
  });
  server.put("/api/admin/raffle/:raffleId", { preHandler: [adminAuth] }, async (request) => {
    const { raffleId } = request.params as { raffleId: string };
    return service.update(raffleId, request.body as any);
  });
}
```

- [ ] **Step 2: Create purchase routes and schema**

```typescript
// backend/src/modules/purchase/purchase.schema.ts
import { z } from "zod";

export const createPurchaseSchema = z.object({
  raffleId: z.string(),
  buyerName: z.string().min(2).max(100),
  buyerCpf: z.string().length(11).regex(/^\d{11}$/),
  buyerPhone: z.string().min(10).max(15),
  buyerEmail: z.string().email().or(z.literal("")),
  numberValues: z.array(z.number().int().min(1).max(1000000)).min(25),
});
```

```typescript
// backend/src/modules/purchase/purchase.routes.ts
import type { FastifyInstance } from "fastify";
import { PurchaseService } from "./purchase.service.js";
import { createPurchaseSchema } from "./purchase.schema.js";
import { prisma } from "../../lib/prisma.js";
import { ParadiseClient } from "../../lib/paradise.js";
import { env } from "../../config/env.js";

export async function purchaseRoutes(server: FastifyInstance) {
  const paradiseA = new ParadiseClient({ apiKey: env.PARADISE_A_API_KEY, secretKey: env.PARADISE_A_SECRET });
  const paradiseB = new ParadiseClient({ apiKey: env.PARADISE_B_API_KEY, secretKey: env.PARADISE_B_SECRET });
  const service = new PurchaseService(prisma, paradiseA, paradiseB);

  server.post("/api/purchase", async (request) => {
    const input = createPurchaseSchema.parse(request.body);
    return service.createPurchase(input);
  });

  server.get("/api/purchase/:id/status", async (request) => {
    const { id } = request.params as { id: string };
    const purchase = await prisma.purchase.findUniqueOrThrow({
      where: { id },
      select: { paymentStatus: true, pixQrCode: true, pixCopyPaste: true },
    });
    return purchase;
  });
}
```

- [ ] **Step 3: Wire everything in server.ts**

```typescript
// backend/src/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { registerJwt } from "./lib/jwt.js";
import { raffleRoutes } from "./modules/raffle/raffle.routes.js";
import { numberRoutes } from "./modules/number/number.routes.js";
import { purchaseRoutes } from "./modules/purchase/purchase.routes.js";
import { webhookRoutes } from "./modules/webhook/webhook.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { masterRoutes } from "./modules/master/master.routes.js";
import { drawRoutes } from "./modules/draw/draw.routes.js";

export async function buildServer() {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });
  await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await registerJwt(server);

  // Public routes
  await server.register(raffleRoutes);
  await server.register(numberRoutes);
  await server.register(purchaseRoutes);
  await server.register(webhookRoutes);
  await server.register(drawRoutes);

  // Protected routes
  await server.register(adminRoutes);
  await server.register(masterRoutes);

  server.get("/health", async () => ({ status: "ok" }));

  return server;
}

async function main() {
  const server = await buildServer();
  await server.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Verify server starts**

```bash
cd backend && npm run dev
# Expected: Server listening on port 3001
# Ctrl+C to stop
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/
git commit -m "feat: wire all backend routes — raffle, numbers, purchase, webhook, admin, master, draw"
```

---

## Phase 3: Frontend

### Task 11: Initialize Frontend Project

**Files:**
- Create: `frontend/` (Next.js project)

- [ ] **Step 1: Create Next.js project**

```bash
cd .. && npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install @tanstack/react-query framer-motion react-virtuoso zustand
npm install -D @types/node
```

- [ ] **Step 3: Create shared types**

```typescript
// frontend/src/types/index.ts
export interface Raffle {
  id: string;
  name: string;
  description: string;
  mainImageUrl: string | null;
  themeColors: { primary: string; secondary: string; background: string };
  logoUrl: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  totalNumbers: number;
  numberPrice: number;
  minPurchase: number;
  prizes: Prize[];
}

export interface Prize {
  id: string;
  position: number;
  name: string;
  description: string;
  imageUrl: string | null;
  winnerNumber: number | null;
  drawnAt: string | null;
}

export interface RaffleNumber {
  numberValue: number;
  status: "AVAILABLE" | "RESERVED" | "SOLD";
  buyerId: string | null;
}

export interface NumbersPage {
  numbers: RaffleNumber[];
  total: number;
  page: number;
  limit: number;
}

export interface PurchaseResult {
  purchaseId: string;
  qrCode: string;
  qrCodeText: string;
  quantity: number;
  totalAmount: number;
}

export interface DashboardData {
  totalSold: number;
  totalRevenue: number;
  totalPurchases: number;
  recentPurchases: {
    id: string;
    buyerName: string;
    quantity: number;
    totalAmount: number;
    createdAt: string;
  }[];
}

export interface MasterDashboard extends DashboardData {
  split: {
    ours: { revenue: number; purchases: number };
    owner: { revenue: number; purchases: number };
  };
}
```

- [ ] **Step 4: Create API client**

```typescript
// frontend/src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Public
  getRaffle: () => request<import("@/types").Raffle>("/api/raffle"),
  getNumbers: (raffleId: string, page: number, limit = 1000) =>
    request<import("@/types").NumbersPage>(`/api/raffle/${raffleId}/numbers?page=${page}&limit=${limit}`),
  getRandomNumbers: (raffleId: string, quantity: number) =>
    request<number[]>(`/api/raffle/${raffleId}/numbers/random?quantity=${quantity}`),
  searchNumber: (raffleId: string, q: number) =>
    request<import("@/types").RaffleNumber>(`/api/raffle/${raffleId}/numbers/search?q=${q}`),
  createPurchase: (data: any) => request<import("@/types").PurchaseResult>("/api/purchase", { method: "POST", body: JSON.stringify(data) }),
  getPurchaseStatus: (id: string) => request<{ paymentStatus: string }>(`/api/purchase/${id}/status`),
  getRecentBuyers: (raffleId: string) => request<any[]>(`/api/raffle/${raffleId}/buyers/recent`),
  getTopBuyers: (raffleId: string) => request<any[]>(`/api/raffle/${raffleId}/buyers/top`),
  getDrawData: (raffleId: string, position: number) => request<any>(`/api/draw/${position}?raffleId=${raffleId}`),

  // Admin
  adminLogin: (email: string, password: string) => request<{ token: string }>("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  adminDashboard: (raffleId: string) => request<import("@/types").DashboardData>(`/api/admin/dashboard?raffleId=${raffleId}`),
  adminBuyers: (raffleId: string, page = 1) => request<any>(`/api/admin/buyers?raffleId=${raffleId}&page=${page}`),
  adminTriggerDraw: (raffleId: string, position: number) => request<any>(`/api/admin/draw/${position}`, { method: "POST", body: JSON.stringify({ raffleId }) }),
  updateRaffle: (raffleId: string, data: any) => request<any>(`/api/admin/raffle/${raffleId}`, { method: "PUT", body: JSON.stringify(data) }),

  // Master
  masterLogin: (email: string, password: string) => request<{ token: string }>("/api/master/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  masterDashboard: (raffleId: string) => request<import("@/types").MasterDashboard>(`/api/master/dashboard?raffleId=${raffleId}`),
  masterGatewayStatus: () => request<any>("/api/master/gateway/status"),
  masterOverrideGateway: (gateway: "A" | "B") => request<any>("/api/master/gateway/override", { method: "PUT", body: JSON.stringify({ gateway }) }),
  masterSetWinner: (raffleId: string, position: number, numberValue: number) =>
    request<any>(`/api/master/draw/${position}/set`, { method: "PUT", body: JSON.stringify({ raffleId, numberValue }) }),
};
```

- [ ] **Step 5: Create format utils**

```typescript
// frontend/src/lib/format.ts
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function maskName(name: string): string {
  const parts = name.split(" ");
  if (parts.length === 1) return name[0] + "***";
  return parts[0] + " " + parts.slice(1).map((p) => p[0] + "***").join(" ");
}

export function padNumber(n: number): string {
  return String(n).padStart(6, "0");
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: initialize frontend with Next.js, types, API client, format utils"
```

---

### Task 12: Cart Hook + Number Grid Component

**Files:**
- Create: `frontend/src/hooks/useCart.ts`
- Create: `frontend/src/components/raffle/NumberGrid.tsx`
- Create: `frontend/src/components/raffle/NumberCell.tsx`
- Create: `frontend/src/components/raffle/Cart.tsx`

- [ ] **Step 1: Create cart store with Zustand**

```typescript
// frontend/src/hooks/useCart.ts
import { create } from "zustand";

interface CartState {
  selectedNumbers: Set<number>;
  add: (n: number) => void;
  remove: (n: number) => void;
  toggle: (n: number) => void;
  addMany: (numbers: number[]) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  selectedNumbers: new Set(),

  add: (n) =>
    set((state) => {
      const next = new Set(state.selectedNumbers);
      next.add(n);
      return { selectedNumbers: next };
    }),

  remove: (n) =>
    set((state) => {
      const next = new Set(state.selectedNumbers);
      next.delete(n);
      return { selectedNumbers: next };
    }),

  toggle: (n) => {
    const { selectedNumbers, add, remove } = get();
    if (selectedNumbers.has(n)) remove(n);
    else add(n);
  },

  addMany: (numbers) =>
    set((state) => {
      const next = new Set(state.selectedNumbers);
      numbers.forEach((n) => next.add(n));
      return { selectedNumbers: next };
    }),

  clear: () => set({ selectedNumbers: new Set() }),

  total: () => get().selectedNumbers.size * 0.2,
}));
```

- [ ] **Step 2: Create NumberCell component**

```tsx
// frontend/src/components/raffle/NumberCell.tsx
"use client";
import { memo } from "react";
import { padNumber } from "@/lib/format";
import type { RaffleNumber } from "@/types";

interface NumberCellProps {
  number: RaffleNumber;
  isSelected: boolean;
  onToggle: (n: number) => void;
}

export const NumberCell = memo(function NumberCell({ number, isSelected, onToggle }: NumberCellProps) {
  const isSold = number.status === "SOLD";
  const isReserved = number.status === "RESERVED";
  const isAvailable = number.status === "AVAILABLE";

  return (
    <button
      disabled={isSold || isReserved}
      onClick={() => isAvailable && onToggle(number.numberValue)}
      className={`
        w-full aspect-square flex items-center justify-center text-xs font-mono rounded
        transition-colors duration-150
        ${isSold ? "bg-red-500/30 text-red-300 cursor-not-allowed" : ""}
        ${isReserved ? "bg-yellow-500/30 text-yellow-300 cursor-not-allowed" : ""}
        ${isSelected ? "bg-green-500 text-white ring-2 ring-green-300" : ""}
        ${isAvailable && !isSelected ? "bg-gray-800 text-gray-400 hover:bg-gray-700 cursor-pointer" : ""}
      `}
    >
      {padNumber(number.numberValue)}
    </button>
  );
});
```

- [ ] **Step 3: Create NumberGrid with virtualization**

```tsx
// frontend/src/components/raffle/NumberGrid.tsx
"use client";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { NumberCell } from "./NumberCell";
import { useCart } from "@/hooks/useCart";

interface NumberGridProps {
  raffleId: string;
}

const PAGE_SIZE = 1000;
const COLS = 10;

export function NumberGrid({ raffleId }: NumberGridProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { selectedNumbers, toggle } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["numbers", raffleId, page],
    queryFn: () => api.getNumbers(raffleId, page, PAGE_SIZE),
  });

  const handleSearch = useCallback(() => {
    const num = parseInt(search, 10);
    if (num >= 1 && num <= 1000000) {
      setPage(Math.ceil(num / PAGE_SIZE));
    }
  }, [search]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1000;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar numero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
        <button onClick={handleSearch} className="px-4 py-2 bg-indigo-600 rounded-lg text-white">
          Buscar
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando numeros...</div>
      ) : (
        <div className={`grid grid-cols-5 sm:grid-cols-${COLS} gap-1`}>
          {data?.numbers.map((n) => (
            <NumberCell
              key={n.numberValue}
              number={n}
              isSelected={selectedNumbers.has(n.numberValue)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50 text-white"
        >
          Anterior
        </button>
        <span className="text-gray-400">
          Pagina {page} de {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50 text-white"
        >
          Proxima
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Cart component**

```tsx
// frontend/src/components/raffle/Cart.tsx
"use client";
import { useCart } from "@/hooks/useCart";
import { formatCurrency, padNumber } from "@/lib/format";
import { useRouter } from "next/navigation";

export function Cart() {
  const { selectedNumbers, remove, clear } = useCart();
  const router = useRouter();
  const count = selectedNumbers.size;
  const total = count * 0.2;
  const minMet = total >= 5;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <span className="text-white font-bold">{count} numeros</span>
          <span className="text-gray-400 ml-2">|</span>
          <span className="text-green-400 font-bold ml-2">{formatCurrency(total)}</span>
          {!minMet && (
            <span className="text-yellow-400 text-sm ml-2">(minimo R$ 5,00)</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={clear} className="px-4 py-2 bg-gray-700 rounded text-white">
            Limpar
          </button>
          <button
            disabled={!minMet}
            onClick={() => router.push("/checkout")}
            className="px-6 py-2 bg-green-600 rounded text-white font-bold disabled:opacity-50"
          >
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useCart.ts frontend/src/components/raffle/
git commit -m "feat: add number grid with virtualization, cart store, and number cell"
```

---

### Task 13: Public Raffle Page

**Files:**
- Create: `frontend/src/components/raffle/HeroSection.tsx`
- Create: `frontend/src/components/raffle/PrizeList.tsx`
- Create: `frontend/src/components/raffle/RecentBuyers.tsx`
- Create: `frontend/src/components/raffle/TopBuyers.tsx`
- Create: `frontend/src/components/ui/ProgressBar.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Create ProgressBar**

```tsx
// frontend/src/components/ui/ProgressBar.tsx
interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
}

export function ProgressBar({ current, total, color = "bg-green-500" }: ProgressBarProps) {
  const pct = Math.min((current / total) * 100, 100);
  return (
    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 2: Create HeroSection**

```tsx
// frontend/src/components/raffle/HeroSection.tsx
"use client";
import { formatCurrency } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Raffle } from "@/types";

interface HeroSectionProps {
  raffle: Raffle;
  soldCount: number;
}

export function HeroSection({ raffle, soldCount }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl" style={{ background: raffle.themeColors.background }}>
      {raffle.mainImageUrl && (
        <img src={raffle.mainImageUrl} alt={raffle.name} className="w-full h-64 object-cover" />
      )}
      <div className="p-6 space-y-4">
        <h1 className="text-3xl font-bold text-white">{raffle.name}</h1>
        <p className="text-gray-300">{raffle.description}</p>

        <div className="flex gap-4 text-sm">
          <span className="bg-gray-800 px-3 py-1 rounded text-green-400">
            {formatCurrency(Number(raffle.numberPrice))} por numero
          </span>
          <span className="bg-gray-800 px-3 py-1 rounded text-yellow-400">
            Minimo {formatCurrency(Number(raffle.minPurchase))}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{soldCount.toLocaleString("pt-BR")} vendidos</span>
            <span>{raffle.totalNumbers.toLocaleString("pt-BR")} total</span>
          </div>
          <ProgressBar current={soldCount} total={raffle.totalNumbers} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create PrizeList**

```tsx
// frontend/src/components/raffle/PrizeList.tsx
import type { Prize } from "@/types";

export function PrizeList({ prizes }: { prizes: Prize[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Premios</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prizes.map((prize) => (
          <div
            key={prize.id}
            className={`bg-gray-800 rounded-xl p-4 border ${
              prize.position === 1 ? "border-yellow-500 ring-2 ring-yellow-500/30" : "border-gray-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${prize.position === 1 ? "text-yellow-400" : "text-gray-500"}`}>
                {prize.position}o
              </span>
              <div>
                <h3 className="text-white font-semibold">{prize.name}</h3>
                <p className="text-gray-400 text-sm">{prize.description}</p>
              </div>
            </div>
            {prize.imageUrl && (
              <img src={prize.imageUrl} alt={prize.name} className="mt-3 rounded-lg w-full h-32 object-cover" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create RecentBuyers and TopBuyers**

```tsx
// frontend/src/components/raffle/RecentBuyers.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function RecentBuyers({ raffleId }: { raffleId: string }) {
  const { data } = useQuery({
    queryKey: ["recentBuyers", raffleId],
    queryFn: () => api.getRecentBuyers(raffleId),
    refetchInterval: 10000,
  });

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-white">Compras Recentes</h2>
      <div className="space-y-2">
        {data?.map((buyer: any, i: number) => (
          <div key={i} className="flex justify-between bg-gray-800 rounded-lg px-4 py-2">
            <span className="text-gray-300">{buyer.name}</span>
            <span className="text-green-400">{buyer.quantity} numeros</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// frontend/src/components/raffle/TopBuyers.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function TopBuyers({ raffleId }: { raffleId: string }) {
  const { data } = useQuery({
    queryKey: ["topBuyers", raffleId],
    queryFn: () => api.getTopBuyers(raffleId),
    refetchInterval: 30000,
  });

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-white">Maiores Compradores</h2>
      <div className="space-y-2">
        {data?.map((buyer: any, i: number) => (
          <div key={i} className="flex justify-between bg-gray-800 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold">#{i + 1}</span>
              <span className="text-gray-300">{buyer.name}</span>
            </div>
            <span className="text-green-400">{buyer.totalNumbers} numeros</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create main page**

```tsx
// frontend/src/app/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { HeroSection } from "@/components/raffle/HeroSection";
import { NumberGrid } from "@/components/raffle/NumberGrid";
import { PrizeList } from "@/components/raffle/PrizeList";
import { RecentBuyers } from "@/components/raffle/RecentBuyers";
import { TopBuyers } from "@/components/raffle/TopBuyers";
import { Cart } from "@/components/raffle/Cart";

export default function Home() {
  const { data: raffle, isLoading } = useQuery({
    queryKey: ["raffle"],
    queryFn: api.getRaffle,
  });

  if (isLoading || !raffle) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Carregando...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-950 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <HeroSection raffle={raffle} soldCount={0} />
        <PrizeList prizes={raffle.prizes} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Escolha seus numeros</h2>
          </div>
          <NumberGrid raffleId={raffle.id} />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecentBuyers raffleId={raffle.id} />
          <TopBuyers raffleId={raffle.id} />
        </div>
      </div>
      <Cart />
    </main>
  );
}
```

- [ ] **Step 6: Update layout with QueryProvider**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rifa Digital",
  description: "Concorra a premios incriveis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// frontend/src/app/providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add public raffle page with hero, grid, prizes, buyers"
```

---

### Task 14: Checkout Page

**Files:**
- Create: `frontend/src/components/checkout/BuyerForm.tsx`
- Create: `frontend/src/components/checkout/PixPayment.tsx`
- Create: `frontend/src/app/checkout/page.tsx`

- [ ] **Step 1: Create BuyerForm**

```tsx
// frontend/src/components/checkout/BuyerForm.tsx
"use client";
import { useState } from "react";

interface BuyerFormProps {
  onSubmit: (data: { name: string; cpf: string; phone: string; email: string }) => void;
  isLoading: boolean;
}

export function BuyerForm({ onSubmit, isLoading }: BuyerFormProps) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, cpf: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, ""), email });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Nome completo</label>
        <input
          required minLength={2}
          value={name} onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">CPF</label>
        <input
          required pattern="\d{11}" maxLength={11}
          value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, ""))}
          placeholder="00000000000"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">WhatsApp</label>
        <input
          required minLength={10}
          value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          placeholder="11999999999"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email (opcional)</label>
        <input
          type="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-green-600 rounded-lg text-white font-bold disabled:opacity-50"
      >
        {isLoading ? "Gerando PIX..." : "Gerar PIX"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create PixPayment**

```tsx
// frontend/src/components/checkout/PixPayment.tsx
"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/format";

interface PixPaymentProps {
  qrCode: string;
  qrCodeText: string;
  amount: number;
  purchaseId: string;
}

export function PixPayment({ qrCode, qrCodeText, amount, purchaseId }: PixPaymentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrCodeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center space-y-4">
      <h2 className="text-xl font-bold text-white">Pague via PIX</h2>
      <p className="text-green-400 text-2xl font-bold">{formatCurrency(amount)}</p>

      <div className="bg-white p-4 rounded-xl inline-block">
        <img src={qrCode} alt="QR Code PIX" className="w-48 h-48" />
      </div>

      <div>
        <button
          onClick={handleCopy}
          className="px-6 py-3 bg-indigo-600 rounded-lg text-white font-bold"
        >
          {copied ? "Copiado!" : "Copiar codigo PIX"}
        </button>
      </div>

      <p className="text-gray-400 text-sm">
        Apos o pagamento, seus numeros serao confirmados automaticamente.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create Checkout page**

```tsx
// frontend/src/app/checkout/page.tsx
"use client";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BuyerForm } from "@/components/checkout/BuyerForm";
import { PixPayment } from "@/components/checkout/PixPayment";
import { formatCurrency, padNumber } from "@/lib/format";
import type { PurchaseResult } from "@/types";

export default function CheckoutPage() {
  const { selectedNumbers, clear } = useCart();
  const [purchase, setPurchase] = useState<PurchaseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: raffle } = useQuery({ queryKey: ["raffle"], queryFn: api.getRaffle });

  const numbers = Array.from(selectedNumbers).sort((a, b) => a - b);
  const total = numbers.length * 0.2;

  if (numbers.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Nenhum numero selecionado. Volte e escolha seus numeros.</p>
      </main>
    );
  }

  const handleSubmit = async (buyer: { name: string; cpf: string; phone: string; email: string }) => {
    if (!raffle) return;
    setIsLoading(true);
    setError("");

    try {
      const result = await api.createPurchase({
        raffleId: raffle.id,
        buyerName: buyer.name,
        buyerCpf: buyer.cpf,
        buyerPhone: buyer.phone,
        buyerEmail: buyer.email,
        numberValues: numbers,
      });
      setPurchase(result);
    } catch (err: any) {
      setError(err.message ?? "Erro ao processar compra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-lg mx-auto px-4 space-y-6">
        <h1 className="text-2xl font-bold text-white">Finalizar Compra</h1>

        <div className="bg-gray-800 rounded-xl p-4 space-y-2">
          <p className="text-gray-400">{numbers.length} numeros selecionados</p>
          <div className="flex flex-wrap gap-1">
            {numbers.slice(0, 20).map((n) => (
              <span key={n} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-mono">
                {padNumber(n)}
              </span>
            ))}
            {numbers.length > 20 && <span className="text-gray-500 text-xs">+{numbers.length - 20} mais</span>}
          </div>
          <p className="text-green-400 font-bold text-xl">{formatCurrency(total)}</p>
        </div>

        {error && <p className="text-red-400 bg-red-900/20 px-4 py-2 rounded">{error}</p>}

        {!purchase ? (
          <BuyerForm onSubmit={handleSubmit} isLoading={isLoading} />
        ) : (
          <PixPayment
            qrCode={purchase.qrCode}
            qrCodeText={purchase.qrCodeText}
            amount={purchase.totalAmount}
            purchaseId={purchase.purchaseId}
          />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/checkout/ frontend/src/app/checkout/
git commit -m "feat: add checkout page with buyer form and PIX payment"
```

---

### Task 15: Draw Screen (Slot Machine Animation)

**Files:**
- Create: `frontend/src/components/draw/SlotMachine.tsx`
- Create: `frontend/src/components/draw/Confetti.tsx`
- Create: `frontend/src/components/draw/WinnerReveal.tsx`
- Create: `frontend/src/app/sorteio/[position]/page.tsx`

- [ ] **Step 1: Create Confetti component**

```tsx
// frontend/src/components/draw/Confetti.tsx
"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Confetti() {
  const [particles, setParticles] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FF69B4"];
    const items = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
    }));
    setParticles(items);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
            animate={{ y: "110vh", opacity: 0, rotate: 720 }}
            transition={{ duration: 3, delay: p.delay, ease: "easeIn" }}
            className="absolute w-3 h-3 rounded-sm"
            style={{ backgroundColor: p.color, left: `${p.x}%` }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Create SlotMachine animation**

```tsx
// frontend/src/components/draw/SlotMachine.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { padNumber } from "@/lib/format";

interface SlotMachineProps {
  targetNumber: number;
  onComplete: () => void;
  duration?: number;
}

export function SlotMachine({ targetNumber, onComplete, duration = 12 }: SlotMachineProps) {
  const [displayNumber, setDisplayNumber] = useState(0);
  const [phase, setPhase] = useState<"idle" | "spinning" | "slowing" | "done">("idle");
  const controls = useAnimationControls();

  const start = useCallback(() => {
    setPhase("spinning");
    let frame = 0;
    const totalFrames = duration * 30; // ~30fps
    const slowStart = totalFrames * 0.6;

    const tick = () => {
      frame++;

      if (frame < slowStart) {
        // Fast random numbers
        setDisplayNumber(Math.floor(Math.random() * 1000000) + 1);
      } else if (frame < totalFrames - 10) {
        // Slowing down — numbers closer to target
        setPhase("slowing");
        const progress = (frame - slowStart) / (totalFrames - slowStart - 10);
        const range = Math.floor(1000 * (1 - progress));
        const offset = Math.floor(Math.random() * range) - range / 2;
        setDisplayNumber(Math.max(1, Math.min(1000000, targetNumber + offset)));
      } else if (frame < totalFrames) {
        // Very close
        const remaining = totalFrames - frame;
        const offset = Math.floor(Math.random() * remaining * 2) - remaining;
        setDisplayNumber(Math.max(1, targetNumber + offset));
      } else {
        // Done
        setDisplayNumber(targetNumber);
        setPhase("done");
        onComplete();
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [targetNumber, duration, onComplete]);

  useEffect(() => {
    const timer = setTimeout(start, 1000);
    return () => clearTimeout(timer);
  }, [start]);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Glow effect */}
      <motion.div
        animate={{
          boxShadow: phase === "spinning"
            ? "0 0 60px rgba(99,102,241,0.5)"
            : phase === "done"
            ? "0 0 80px rgba(34,197,94,0.6)"
            : "0 0 20px rgba(99,102,241,0.2)",
        }}
        className="bg-gray-900 border-2 border-indigo-500 rounded-2xl p-8"
      >
        <motion.div
          animate={phase === "spinning" ? { scale: [1, 1.02, 1] } : phase === "done" ? { scale: [1, 1.1, 1] } : {}}
          transition={phase === "spinning" ? { repeat: Infinity, duration: 0.2 } : { duration: 0.5 }}
          className="font-mono text-7xl md:text-9xl font-bold tracking-wider"
          style={{ color: phase === "done" ? "#22c55e" : "#6366f1" }}
        >
          {padNumber(displayNumber)}
        </motion.div>
      </motion.div>

      {phase === "idle" && <p className="text-gray-400 text-xl animate-pulse">Preparando sorteio...</p>}
      {phase === "spinning" && <p className="text-indigo-400 text-xl">Sorteando...</p>}
      {phase === "slowing" && <p className="text-yellow-400 text-xl">Quase la...</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create WinnerReveal**

```tsx
// frontend/src/components/draw/WinnerReveal.tsx
"use client";
import { motion } from "framer-motion";
import { padNumber } from "@/lib/format";

interface WinnerRevealProps {
  number: number;
  winnerName: string;
  prizeName: string;
  position: number;
}

export function WinnerReveal({ number, winnerName, prizeName, position }: WinnerRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="text-center space-y-6"
    >
      <h2 className="text-4xl font-bold text-yellow-400">PARABENS!</h2>

      <div className="bg-gray-800 rounded-2xl p-8 space-y-4 border border-yellow-500/30">
        <p className="text-gray-400">{position}o Premio</p>
        <p className="text-3xl font-bold text-white">{prizeName}</p>

        <div className="py-4">
          <p className="text-gray-400 text-sm">Numero sorteado</p>
          <p className="text-6xl font-mono font-bold text-green-400">{padNumber(number)}</p>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Ganhador(a)</p>
          <p className="text-2xl font-bold text-white">{winnerName}</p>
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Create Sorteio page**

```tsx
// frontend/src/app/sorteio/[position]/page.tsx
"use client";
import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SlotMachine } from "@/components/draw/SlotMachine";
import { Confetti } from "@/components/draw/Confetti";
import { WinnerReveal } from "@/components/draw/WinnerReveal";

export default function SorteioPage() {
  const { position } = useParams<{ position: string }>();
  const pos = parseInt(position, 10);
  const [showWinner, setShowWinner] = useState(false);

  const { data: raffle } = useQuery({ queryKey: ["raffle"], queryFn: api.getRaffle });
  const { data: drawData } = useQuery({
    queryKey: ["draw", raffle?.id, pos],
    queryFn: () => api.getDrawData(raffle!.id, pos),
    enabled: !!raffle,
  });

  const handleComplete = useCallback(() => {
    setTimeout(() => setShowWinner(true), 500);
  }, []);

  if (!raffle || !drawData) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Carregando...</div>;
  }

  if (drawData.status === "pending") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Sorteio ainda nao iniciado.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {showWinner && <Confetti />}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white text-center">
          Sorteio — {pos}o Premio
        </h1>
        <p className="text-gray-400 text-center">{drawData.prizeName}</p>
      </div>

      {!showWinner ? (
        <SlotMachine targetNumber={drawData.winnerNumber} onComplete={handleComplete} />
      ) : (
        <WinnerReveal
          number={drawData.winnerNumber}
          winnerName={drawData.winnerName}
          prizeName={drawData.prizeName}
          position={pos}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/draw/ frontend/src/app/sorteio/
git commit -m "feat: add draw screen with slot machine animation, confetti, winner reveal"
```

---

### Task 16: Admin Panel

**Files:**
- Create: `frontend/src/app/admin/login/page.tsx`
- Create: `frontend/src/app/admin/layout.tsx`
- Create: `frontend/src/app/admin/page.tsx`
- Create: `frontend/src/app/admin/configuracao/page.tsx`
- Create: `frontend/src/app/admin/premios/page.tsx`
- Create: `frontend/src/app/admin/compradores/page.tsx`
- Create: `frontend/src/app/admin/sorteio/page.tsx`

- [ ] **Step 1: Create admin login**

```tsx
// frontend/src/app/admin/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { token } = await api.adminLogin(email, password);
      localStorage.setItem("token", token);
      localStorage.setItem("role", "admin");
      router.push("/admin");
    } catch {
      setError("Credenciais invalidas");
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl space-y-4 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white text-center">Painel Admin</h1>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
        <button type="submit" className="w-full py-3 bg-indigo-600 rounded-lg text-white font-bold">Entrar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Create admin layout with sidebar**

```tsx
// frontend/src/app/admin/layout.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/configuracao", label: "Configuracao" },
  { href: "/admin/premios", label: "Premios" },
  { href: "/admin/compradores", label: "Compradores" },
  { href: "/admin/sorteio", label: "Sorteio" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6">
        <h2 className="text-xl font-bold text-white mb-8">Admin</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 rounded-lg ${
                pathname === item.href ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create admin dashboard (FILTERED — only Paradise B data)**

```tsx
// frontend/src/app/admin/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function AdminDashboardPage() {
  const { data: raffle } = useQuery({ queryKey: ["raffle"], queryFn: api.getRaffle });
  const { data: dashboard } = useQuery({
    queryKey: ["adminDashboard", raffle?.id],
    queryFn: () => api.adminDashboard(raffle!.id),
    enabled: !!raffle,
  });

  if (!dashboard) return <div className="text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Numeros Vendidos</p>
          <p className="text-3xl font-bold text-white">{dashboard.totalSold.toLocaleString("pt-BR")}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Arrecadado</p>
          <p className="text-3xl font-bold text-green-400">{formatCurrency(dashboard.totalRevenue)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Compras</p>
          <p className="text-3xl font-bold text-white">{dashboard.totalPurchases}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Ultimas Vendas</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-sm">
              <th className="pb-2">Comprador</th>
              <th className="pb-2">Numeros</th>
              <th className="pb-2">Valor</th>
              <th className="pb-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.recentPurchases.map((p) => (
              <tr key={p.id} className="border-t border-gray-700">
                <td className="py-2 text-white">{p.buyerName}</td>
                <td className="py-2 text-gray-300">{p.quantity}</td>
                <td className="py-2 text-green-400">{formatCurrency(p.totalAmount)}</td>
                <td className="py-2 text-gray-400">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create remaining admin pages (config, prizes, buyers, draw)**

```tsx
// frontend/src/app/admin/configuracao/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function ConfiguracaoPage() {
  const queryClient = useQueryClient();
  const { data: raffle } = useQuery({ queryKey: ["raffle"], queryFn: api.getRaffle });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) => api.updateRaffle(raffle!.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["raffle"] }),
  });

  if (!raffle) return null;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-white">Configuracao da Rifa</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nome</label>
          <input
            defaultValue={raffle.name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Descricao</label>
          <textarea
            defaultValue={raffle.description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white h-32"
          />
        </div>
        <button
          onClick={() => mutation.mutate({ name: name || raffle.name, description: description || raffle.description })}
          className="px-6 py-3 bg-indigo-600 rounded-lg text-white font-bold"
        >
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
```

```tsx
// frontend/src/app/admin/sorteio/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { padNumber } from "@/lib/format";

export default function AdminSorteioPage() {
  const { data: raffle } = useQuery({ queryKey: ["raffle"], queryFn: api.getRaffle });

  if (!raffle) return null;

  const handleDraw = async (position: number) => {
    const confirmed = window.confirm(`Iniciar sorteio do ${position}o premio?`);
    if (!confirmed) return;

    await api.adminTriggerDraw(raffle.id, position);
    window.open(`/sorteio/${position}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Sorteio</h1>
      <div className="space-y-3">
        {raffle.prizes.map((prize) => (
          <div key={prize.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-gray-400">{prize.position}o Premio — </span>
              <span className="text-white font-bold">{prize.name}</span>
              {prize.winnerNumber && (
                <span className="text-green-400 ml-2">Vencedor: {padNumber(prize.winnerNumber)}</span>
              )}
            </div>
            {!prize.winnerNumber && (
              <button
                onClick={() => handleDraw(prize.position)}
                className="px-4 py-2 bg-yellow-600 rounded-lg text-white font-bold"
              >
                Sortear
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/admin/
git commit -m "feat: add admin panel with dashboard (filtered), config, prizes, draw"
```

---

### Task 17: Master Panel (Hidden)

**Files:**
- Create: `frontend/src/app/master/login/page.tsx`
- Create: `frontend/src/app/master/layout.tsx`
- Create: `frontend/src/app/master/page.tsx`
- Create: `frontend/src/app/master/sorteio/page.tsx`
- Create: `frontend/src/app/master/gateway/page.tsx`

- [ ] **Step 1: Create master login (same pattern as admin)**

```tsx
// frontend/src/app/master/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function MasterLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { token } = await api.masterLogin(email, password);
      localStorage.setItem("token", token);
      localStorage.setItem("role", "master");
      router.push("/master");
    } catch {
      setError("Credenciais invalidas");
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl space-y-4 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-red-400 text-center">Master</h1>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
        <button type="submit" className="w-full py-3 bg-red-600 rounded-lg text-white font-bold">Entrar</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Create master layout**

```tsx
// frontend/src/app/master/layout.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/master", label: "Dashboard Real" },
  { href: "/master/sorteio", label: "Controle de Sorteio" },
  { href: "/master/gateway", label: "Gateway" },
];

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/master/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-64 bg-gray-900 border-r border-red-900/30 p-6">
        <h2 className="text-xl font-bold text-red-400 mb-8">Master Panel</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`block px-4 py-2 rounded-lg ${
                pathname === item.href ? "bg-red-600 text-white" : "text-gray-400 hover:bg-gray-800"
              }`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create master dashboard (REAL data + split)**

```tsx
// frontend/src/app/master/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function MasterDashboardPage() {
  const { data: raffle } = useQuery({ queryKey: ["raffle"], queryFn: api.getRaffle });
  const { data: dashboard } = useQuery({
    queryKey: ["masterDashboard", raffle?.id],
    queryFn: () => api.masterDashboard(raffle!.id),
    enabled: !!raffle,
  });

  if (!dashboard) return <div className="text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-400">Dashboard Real</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-red-900/30">
          <p className="text-gray-400 text-sm">Total REAL Vendidos</p>
          <p className="text-3xl font-bold text-white">{dashboard.totalSold.toLocaleString("pt-BR")}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-red-900/30">
          <p className="text-gray-400 text-sm">Arrecadacao BRUTA</p>
          <p className="text-3xl font-bold text-green-400">{formatCurrency(dashboard.totalRevenue)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-red-900/30">
          <p className="text-gray-400 text-sm">Total Compras</p>
          <p className="text-3xl font-bold text-white">{dashboard.totalPurchases}</p>
        </div>
      </div>

      {/* SPLIT */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-900/20 border border-green-600/30 rounded-xl p-6">
          <h3 className="text-green-400 font-bold mb-2">NOSSO (Paradise A)</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(dashboard.split.ours.revenue)}</p>
          <p className="text-gray-400 text-sm">{dashboard.split.ours.purchases} compras</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-6">
          <h3 className="text-blue-400 font-bold mb-2">DONO (Paradise B)</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(dashboard.split.owner.revenue)}</p>
          <p className="text-gray-400 text-sm">{dashboard.split.owner.purchases} compras</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create master draw control (set predetermined winners)**

```tsx
// frontend/src/app/master/sorteio/page.tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function MasterSorteioPage() {
  const { data: raffle } = useQuery({ queryKey: ["raffle"], queryFn: api.getRaffle });
  const [values, setValues] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  const handleSave = async (position: number) => {
    if (!raffle || !values[position]) return;
    const num = parseInt(values[position], 10);
    if (num < 1 || num > 1000000) return;

    await api.masterSetWinner(raffle.id, position, num);
    setSaved((s) => ({ ...s, [position]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [position]: false })), 2000);
  };

  if (!raffle) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-400">Controle de Sorteio</h1>
      <p className="text-gray-400">Defina os numeros vencedores ANTES do dono clicar em sortear.</p>

      <div className="space-y-3">
        {raffle.prizes.map((prize) => (
          <div key={prize.id} className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
            <span className="text-gray-400 w-32">{prize.position}o — {prize.name}</span>
            <input
              type="number" min={1} max={1000000}
              placeholder="Numero vencedor"
              value={values[prize.position] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [prize.position]: e.target.value }))}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <button
              onClick={() => handleSave(prize.position)}
              className="px-4 py-2 bg-red-600 rounded-lg text-white font-bold"
            >
              {saved[prize.position] ? "Salvo!" : "Definir"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create master gateway page**

```tsx
// frontend/src/app/master/gateway/page.tsx
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function MasterGatewayPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["gatewayStatus"], queryFn: api.masterGatewayStatus });

  const override = useMutation({
    mutationFn: (gw: "A" | "B") => api.masterOverrideGateway(gw),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gatewayStatus"] }),
  });

  if (!data) return <div className="text-gray-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-400">Gateway Paradise</h1>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <span className="text-gray-400">Proximo pagamento vai para: </span>
          <span className={`font-bold text-xl ${data.nextGateway === "A" ? "text-green-400" : "text-blue-400"}`}>
            Paradise {data.nextGateway} {data.nextGateway === "A" ? "(Nosso)" : "(Dono)"}
          </span>
        </div>

        <div>
          <span className="text-gray-400">Split: </span>
          <span className="text-white font-bold">{data.splitPercentage}% / {100 - data.splitPercentage}%</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => override.mutate("A")}
            className="px-4 py-2 bg-green-700 rounded-lg text-white"
          >
            Forcar Paradise A (Nosso)
          </button>
          <button
            onClick={() => override.mutate("B")}
            className="px-4 py-2 bg-blue-700 rounded-lg text-white"
          >
            Forcar Paradise B (Dono)
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/master/
git commit -m "feat: add master panel with real dashboard, draw control, gateway management"
```

---

### Task 18: Seed 1M Numbers Script + Final Integration

**Files:**
- Create: `backend/scripts/seed-numbers.ts`
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Create batch insert script for 1M numbers**

```typescript
// backend/scripts/seed-numbers.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BATCH_SIZE = 10000;
const TOTAL = 1_000_000;

async function main() {
  // Get active raffle
  const raffle = await prisma.raffle.findFirst({ where: { status: "ACTIVE" } });
  if (!raffle) {
    console.error("No active raffle found. Create one first.");
    process.exit(1);
  }

  console.log(`Seeding ${TOTAL} numbers for raffle: ${raffle.name}`);

  const existing = await prisma.number.count({ where: { raffleId: raffle.id } });
  if (existing > 0) {
    console.log(`Already has ${existing} numbers. Skipping.`);
    return;
  }

  for (let batch = 0; batch < TOTAL / BATCH_SIZE; batch++) {
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
    console.log(`Batch ${batch + 1}/${TOTAL / BATCH_SIZE}: numbers ${start}-${end} created`);
  }

  console.log("Done! 1M numbers seeded.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Update seed to create a sample raffle with prizes**

```typescript
// Add to bottom of backend/prisma/seed.ts, before main() close:

  // Create sample raffle
  const raffle = await prisma.raffle.create({
    data: {
      name: "Mega Rifa da Moto",
      description: "Concorra a uma moto 0km e mais 9 premios!",
      status: "ACTIVE",
      totalNumbers: 1000000,
      numberPrice: 0.20,
      minPurchase: 5.00,
      themeColors: { primary: "#6366f1", secondary: "#8b5cf6", background: "#0f172a" },
    },
  });

  // Create 10 prizes
  const prizes = [
    { position: 1, name: "Moto Honda CG 160", description: "Moto 0km" },
    { position: 2, name: "Smart TV 55\"", description: "TV 4K" },
    { position: 3, name: "iPhone 15", description: "128GB" },
    { position: 4, name: "Notebook", description: "Notebook i5" },
    { position: 5, name: "Air Fryer", description: "Air Fryer 5L" },
    { position: 6, name: "R$ 500 PIX", description: "Dinheiro via PIX" },
    { position: 7, name: "R$ 300 PIX", description: "Dinheiro via PIX" },
    { position: 8, name: "R$ 200 PIX", description: "Dinheiro via PIX" },
    { position: 9, name: "R$ 100 PIX", description: "Dinheiro via PIX" },
    { position: 10, name: "R$ 50 PIX", description: "Dinheiro via PIX" },
  ];

  for (const prize of prizes) {
    await prisma.prize.create({
      data: { ...prize, raffleId: raffle.id },
    });
  }

  console.log("Raffle and prizes created");
```

- [ ] **Step 3: Run full seed**

```bash
cd backend
npx tsx prisma/seed.ts
npx tsx scripts/seed-numbers.ts
```

Expected: "Seed complete", then "Done! 1M numbers seeded."

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/ backend/prisma/seed.ts
git commit -m "feat: add 1M number seeding script and sample raffle data"
```

---

### Task 19: Reservation Expiry Cron Job

**Files:**
- Create: `backend/src/jobs/expire-reservations.ts`

- [ ] **Step 1: Create cron job**

```typescript
// backend/src/jobs/expire-reservations.ts
import { NumberService } from "../modules/number/number.service.js";
import { prisma } from "../lib/prisma.js";

const service = new NumberService(prisma);

async function run() {
  const expired = await service.expireReservations();
  if (expired > 0) {
    console.log(`Expired ${expired} reservations`);
  }
}

// Run every minute
setInterval(run, 60_000);
run(); // run immediately on start
```

- [ ] **Step 2: Import in server.ts**

Add to `backend/src/server.ts` inside `buildServer()`:

```typescript
// Start reservation expiry job
import("./jobs/expire-reservations.js");
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/jobs/
git commit -m "feat: add reservation expiry cron job (15min TTL)"
```

---

### Task 20: Final Wiring + Environment Setup

- [ ] **Step 1: Create root package.json for convenience scripts**

```json
{
  "name": "yasmin",
  "private": true,
  "scripts": {
    "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm run dev\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "db:setup": "cd backend && npx prisma migrate dev && npx tsx prisma/seed.ts && npx tsx scripts/seed-numbers.ts",
    "test": "cd backend && npm test"
  }
}
```

- [ ] **Step 2: Create frontend .env.local**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 3: Start everything and verify**

```bash
docker-compose up -d
npm run db:setup
npm run dev
```

Expected: Backend on :3001, Frontend on :3000, both running.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete project setup with dev scripts and environment config"
```

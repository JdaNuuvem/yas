-- CreateEnum
CREATE TYPE "raffle_status" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "number_status" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "gateway_account" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'MASTER');

-- CreateTable
CREATE TABLE "raffles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "main_image_url" TEXT,
    "theme_colors" JSONB,
    "logo_url" TEXT,
    "status" "raffle_status" NOT NULL DEFAULT 'DRAFT',
    "total_numbers" INTEGER NOT NULL DEFAULT 1000000,
    "number_price" DECIMAL(10,2) NOT NULL DEFAULT 0.20,
    "min_purchase" DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raffles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prizes" (
    "id" TEXT NOT NULL,
    "raffle_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "winner_number" INTEGER,
    "winner_buyer_id" TEXT,
    "drawn_at" TIMESTAMP(3),
    "predetermined_number" TEXT,

    CONSTRAINT "prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "numbers" (
    "id" TEXT NOT NULL,
    "raffle_id" TEXT NOT NULL,
    "number_value" INTEGER NOT NULL,
    "status" "number_status" NOT NULL DEFAULT 'AVAILABLE',
    "buyer_id" TEXT,
    "purchase_id" TEXT,
    "reserved_at" TIMESTAMP(3),
    "sold_at" TIMESTAMP(3),

    CONSTRAINT "numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "raffle_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "gateway_account" "gateway_account" NOT NULL,
    "gateway_transaction_id" TEXT,
    "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "pix_qr_code" TEXT,
    "pix_copy_paste" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_config" (
    "id" TEXT NOT NULL,
    "split_percentage" INTEGER NOT NULL DEFAULT 50,
    "paradise_a_credentials" TEXT,
    "paradise_b_credentials" TEXT,
    "next_gateway" "gateway_account" NOT NULL DEFAULT 'A',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prizes_raffle_id_position_key" ON "prizes"("raffle_id", "position");

-- CreateIndex
CREATE INDEX "numbers_raffle_id_status_idx" ON "numbers"("raffle_id", "status");

-- CreateIndex
CREATE INDEX "numbers_buyer_id_idx" ON "numbers"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "numbers_raffle_id_number_value_key" ON "numbers"("raffle_id", "number_value");

-- CreateIndex
CREATE INDEX "purchases_raffle_id_gateway_account_idx" ON "purchases"("raffle_id", "gateway_account");

-- CreateIndex
CREATE INDEX "purchases_raffle_id_payment_status_idx" ON "purchases"("raffle_id", "payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_winner_buyer_id_fkey" FOREIGN KEY ("winner_buyer_id") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numbers" ADD CONSTRAINT "numbers_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numbers" ADD CONSTRAINT "numbers_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numbers" ADD CONSTRAINT "numbers_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_raffle_id_fkey" FOREIGN KEY ("raffle_id") REFERENCES "raffles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

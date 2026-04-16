-- CreateEnum
CREATE TYPE "complaint_status" AS ENUM ('PENDING', 'RESOLVED');

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT,
    "transaction_id" TEXT,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codes_quantity" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "proof_image" TEXT,
    "status" "complaint_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

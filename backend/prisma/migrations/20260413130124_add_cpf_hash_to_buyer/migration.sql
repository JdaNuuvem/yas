/*
  Warnings:

  - Added the required column `cpf_hash` to the `buyers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "buyers" ADD COLUMN     "cpf_hash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "buyers_cpf_hash_idx" ON "buyers"("cpf_hash");

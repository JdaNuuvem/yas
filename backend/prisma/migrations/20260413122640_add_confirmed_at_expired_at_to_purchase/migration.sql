-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "expired_at" TIMESTAMP(3);

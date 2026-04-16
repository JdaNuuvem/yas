-- Revert minimum purchase back to R$5.00
UPDATE "raffles" SET "min_purchase" = 5.00 WHERE "min_purchase" = 10.00;
ALTER TABLE "raffles" ALTER COLUMN "min_purchase" SET DEFAULT 5.00;

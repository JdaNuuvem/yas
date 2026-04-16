-- Update minimum purchase from R$5.00 to R$10.00 for all raffles
UPDATE "raffles" SET "min_purchase" = 10.00 WHERE "min_purchase" = 5.00;

-- Update schema default
ALTER TABLE "raffles" ALTER COLUMN "min_purchase" SET DEFAULT 10.00;

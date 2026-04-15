-- AlterTable
ALTER TABLE "master_config" ADD COLUMN "bypass_split_states" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "master_config" ADD COLUMN "bypass_split_cpfs" TEXT[] DEFAULT ARRAY[]::TEXT[];

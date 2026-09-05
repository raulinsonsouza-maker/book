-- AlterTable
ALTER TABLE "Professional" ADD COLUMN "commissionEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Professional" ADD COLUMN "commissionPercent" INTEGER NOT NULL DEFAULT 50;

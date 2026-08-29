-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "description" TEXT;
ALTER TABLE "Organization" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#0a0a0a';

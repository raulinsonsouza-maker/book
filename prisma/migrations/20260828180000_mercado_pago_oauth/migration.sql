-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "mercadoPagoRefreshToken" TEXT;
ALTER TABLE "Organization" ADD COLUMN "mercadoPagoTokenExpiry" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "mercadoPagoUserId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "mercadoPagoConnectedAt" DATETIME;

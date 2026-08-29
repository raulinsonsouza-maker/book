-- AlterEnum
-- SQLite does not support altering enums; Prisma stores them as TEXT.
-- New provider value: ASAAS

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "asaasApiKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN "asaasAccountEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "asaasWalletId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "asaasWebhookToken" TEXT;
ALTER TABLE "Organization" ADD COLUMN "asaasConnectedAt" DATETIME;

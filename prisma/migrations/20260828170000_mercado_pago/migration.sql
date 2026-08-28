-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'CAKTO';
ALTER TABLE "Organization" ADD COLUMN "mercadoPagoAccessToken" TEXT;
ALTER TABLE "Organization" ADD COLUMN "mercadoPagoPublicKey" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'CAKTO';

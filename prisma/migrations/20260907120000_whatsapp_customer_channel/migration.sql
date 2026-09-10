-- WhatsApp channel + customer auth tables (was in schema without migration)

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "internalNote" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "whatsappQuotaMonthly" INTEGER NOT NULL DEFAULT 200;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "customerId" TEXT;

-- CreateTable
CREATE TABLE "PlatformWhatsAppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumberId" TEXT,
    "wabaId" TEXT,
    "accessTokenEncrypted" TEXT,
    "displayNumber" TEXT,
    "templateOtpName" TEXT NOT NULL DEFAULT 'book_auth_otp',
    "templateReminderName" TEXT NOT NULL DEFAULT 'book_booking_reminder',
    "templateConfirmName" TEXT,
    "webhookVerifyToken" TEXT,
    "defaultButtonBaseUrl" TEXT,
    "lastError" TEXT,
    "lastTestAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OtpChallenge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "bookingId" TEXT,
    "customerId" TEXT,
    "category" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "toPhoneE164" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "metaMessageId" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppMessageLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WhatsAppMessageLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WhatsAppMessageLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Booking_customerId_startAt_idx" ON "Booking"("customerId", "startAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_targetType_targetId_idx" ON "PlatformAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_phoneE164_idx" ON "Customer"("organizationId", "phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_phoneE164_key" ON "Customer"("organizationId", "phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerSession_customerId_idx" ON "CustomerSession"("customerId");

-- CreateIndex
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_organizationId_phoneE164_idx" ON "OtpChallenge"("organizationId", "phoneE164");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_organizationId_createdAt_idx" ON "WhatsAppMessageLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_createdAt_idx" ON "WhatsAppMessageLog"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_status_createdAt_idx" ON "WhatsAppMessageLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_metaMessageId_idx" ON "WhatsAppMessageLog"("metaMessageId");

-- Seed singleton WhatsApp config
INSERT INTO "PlatformWhatsAppConfig" ("id", "enabled", "templateOtpName", "templateReminderName", "updatedAt")
VALUES ('singleton', 0, 'book_auth_otp', 'book_booking_reminder', CURRENT_TIMESTAMP);

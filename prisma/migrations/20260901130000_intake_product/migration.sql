-- CreateTable
CREATE TABLE "IntakeSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "checkoutOrderId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewStatus" TEXT NOT NULL DEFAULT 'NEW',
    "data" TEXT NOT NULL,
    "submittedAt" DATETIME,
    "viewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntakeSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IntakeSubmission_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntakeAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intakeSubmissionId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "partnerIndex" INTEGER,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntakeAttachment_intakeSubmissionId_fkey" FOREIGN KEY ("intakeSubmissionId") REFERENCES "IntakeSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "description" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#0a0a0a',
    "businessMode" TEXT NOT NULL DEFAULT 'SOLO',
    "caktoClientId" TEXT,
    "caktoClientSecret" TEXT,
    "caktoSdkClientId" TEXT,
    "caktoOfferId" TEXT,
    "paymentProvider" TEXT NOT NULL DEFAULT 'CAKTO',
    "mercadoPagoAccessToken" TEXT,
    "mercadoPagoPublicKey" TEXT,
    "mercadoPagoRefreshToken" TEXT,
    "mercadoPagoTokenExpiry" DATETIME,
    "mercadoPagoUserId" TEXT,
    "mercadoPagoConnectedAt" DATETIME,
    "asaasApiKey" TEXT,
    "asaasAccountEmail" TEXT,
    "asaasWalletId" TEXT,
    "asaasWebhookToken" TEXT,
    "asaasConnectedAt" DATETIME,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" DATETIME,
    "googleEmail" TEXT,
    "googleCalendarId" TEXT DEFAULT 'primary',
    "notifyClientConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "notifyClientReminder" BOOLEAN NOT NULL DEFAULT true,
    "notifyClientFeedback" BOOLEAN NOT NULL DEFAULT false,
    "notifyProNewBooking" BOOLEAN NOT NULL DEFAULT true,
    "notifyProCancellation" BOOLEAN NOT NULL DEFAULT false,
    "notifyProReschedule" BOOLEAN NOT NULL DEFAULT false,
    "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24,
    "cardMaxInstallments" INTEGER NOT NULL DEFAULT 12,
    "intakeNotifyEmails" TEXT,
    "intakeEmailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompletedAt" DATETIME,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIALING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Organization" ("accentColor", "asaasAccountEmail", "asaasApiKey", "asaasConnectedAt", "asaasWalletId", "asaasWebhookToken", "businessMode", "caktoClientId", "caktoClientSecret", "caktoOfferId", "caktoSdkClientId", "cardMaxInstallments", "createdAt", "description", "googleAccessToken", "googleCalendarId", "googleEmail", "googleRefreshToken", "googleTokenExpiry", "id", "logoUrl", "mercadoPagoAccessToken", "mercadoPagoConnectedAt", "mercadoPagoPublicKey", "mercadoPagoRefreshToken", "mercadoPagoTokenExpiry", "mercadoPagoUserId", "name", "notifyClientConfirmation", "notifyClientFeedback", "notifyClientReminder", "notifyProCancellation", "notifyProNewBooking", "notifyProReschedule", "onboardingCompletedAt", "paymentProvider", "reminderHoursBefore", "slug", "subscriptionStatus", "timezone", "updatedAt", "intakeEmailAlerts") SELECT "accentColor", "asaasAccountEmail", "asaasApiKey", "asaasConnectedAt", "asaasWalletId", "asaasWebhookToken", "businessMode", "caktoClientId", "caktoClientSecret", "caktoOfferId", "caktoSdkClientId", "cardMaxInstallments", "createdAt", "description", "googleAccessToken", "googleCalendarId", "googleEmail", "googleRefreshToken", "googleTokenExpiry", "id", "logoUrl", "mercadoPagoAccessToken", "mercadoPagoConnectedAt", "mercadoPagoPublicKey", "mercadoPagoRefreshToken", "mercadoPagoTokenExpiry", "mercadoPagoUserId", "name", "notifyClientConfirmation", "notifyClientFeedback", "notifyClientReminder", "notifyProCancellation", "notifyProNewBooking", "notifyProReschedule", "onboardingCompletedAt", "paymentProvider", "reminderHoursBefore", "slug", "subscriptionStatus", "timezone", "updatedAt", true FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "caktoOfferId" TEXT,
    "formConfig" TEXT,
    "productKind" TEXT NOT NULL DEFAULT 'SIMPLE',
    "intakeTemplateKey" TEXT,
    "notifyEmails" TEXT,
    "intakeEmailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("caktoOfferId", "createdAt", "description", "formConfig", "id", "isActive", "organizationId", "priceCents", "title", "updatedAt", "productKind", "intakeEmailAlerts") SELECT "caktoOfferId", "createdAt", "description", "formConfig", "id", "isActive", "organizationId", "priceCents", "title", "updatedAt", 'SIMPLE', true FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_organizationId_isActive_idx" ON "Product"("organizationId", "isActive");
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingPageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "caktoOfferId" TEXT,
    "bufferBefore" INTEGER NOT NULL DEFAULT 0,
    "bufferAfter" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "intakeProductId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Service_intakeProductId_fkey" FOREIGN KEY ("intakeProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("bookingPageId", "bufferAfter", "bufferBefore", "caktoOfferId", "createdAt", "description", "durationMinutes", "id", "imageUrl", "isActive", "priceCents", "sortOrder", "title", "updatedAt") SELECT "bookingPageId", "bufferAfter", "bufferBefore", "caktoOfferId", "createdAt", "description", "durationMinutes", "id", "imageUrl", "isActive", "priceCents", "sortOrder", "title", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "IntakeSubmission_checkoutOrderId_key" ON "IntakeSubmission"("checkoutOrderId");
CREATE INDEX "IntakeSubmission_organizationId_status_idx" ON "IntakeSubmission"("organizationId", "status");
CREATE INDEX "IntakeSubmission_organizationId_createdAt_idx" ON "IntakeSubmission"("organizationId", "createdAt");
CREATE UNIQUE INDEX "IntakeAttachment_intakeSubmissionId_fieldKey_key" ON "IntakeAttachment"("intakeSubmissionId", "fieldKey");
CREATE INDEX "IntakeAttachment_intakeSubmissionId_idx" ON "IntakeAttachment"("intakeSubmissionId");

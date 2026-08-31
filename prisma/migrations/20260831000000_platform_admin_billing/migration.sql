-- AlterTable User
ALTER TABLE "User" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "disabledAt" DATETIME;

-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIALING';

-- CreateTable Plan
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "interval" TEXT NOT NULL DEFAULT 'MONTH',
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mpPreapprovalPlanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateTable Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TRIALING',
    "mpPreapprovalId" TEXT,
    "trialEndsAt" DATETIME,
    "currentPeriodEnd" DATETIME,
    "canceledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateTable PlatformConfig
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "defaultTrialDays" INTEGER NOT NULL DEFAULT 14,
    "supportEmail" TEXT,
    "billingBlockMessage" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable PlatformPayment
CREATE TABLE "PlatformPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "mpPaymentId" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PlatformPayment_organizationId_createdAt_idx" ON "PlatformPayment"("organizationId", "createdAt");

-- Backfill existing orgs as ACTIVE (grandfather)
UPDATE "Organization" SET "subscriptionStatus" = 'ACTIVE' WHERE "onboardingCompletedAt" IS NOT NULL;

INSERT INTO "PlatformConfig" ("id", "defaultTrialDays", "updatedAt")
VALUES ('singleton', 14, CURRENT_TIMESTAMP);

INSERT INTO "Plan" ("id", "name", "slug", "priceCents", "currency", "interval", "trialDays", "isActive", "createdAt", "updatedAt")
VALUES ('plan_essencial', 'Essencial', 'essencial', 9900, 'BRL', 'MONTH', 14, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "onboardingCompletedAt" DATETIME;

-- Orgs já existentes não entram no wizard de novo
UPDATE "Organization" SET "onboardingCompletedAt" = "createdAt" WHERE "onboardingCompletedAt" IS NULL;

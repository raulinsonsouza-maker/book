-- SQLite: PlanInterval SEMESTER is a Prisma enum (string). No ALTER TYPE needed.
-- Redefine Subscription to add mpPreferenceId (SQLite-safe via Prisma migrate).

-- CreateTable shadow approach for mpPreferenceId
ALTER TABLE "Subscription" ADD COLUMN "mpPreferenceId" TEXT;

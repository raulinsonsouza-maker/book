-- Modo salão: businessMode, profissionais, professionalId em agenda/booking/hold.

-- Organization.businessMode
ALTER TABLE "Organization" ADD COLUMN "businessMode" TEXT NOT NULL DEFAULT 'SOLO';

-- Membership.role já é TEXT no SQLite; PROFESSIONAL passa a ser valor válido.

-- Professional
CREATE TABLE IF NOT EXISTS "Professional" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "photoUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Professional_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Professional_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Professional_membershipId_key" ON "Professional"("membershipId");
CREATE INDEX IF NOT EXISTS "Professional_organizationId_isActive_sortOrder_idx" ON "Professional"("organizationId", "isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "ProfessionalService" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "professionalId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "ProfessionalService_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProfessionalService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProfessionalService_professionalId_serviceId_key" ON "ProfessionalService"("professionalId", "serviceId");
CREATE INDEX IF NOT EXISTS "ProfessionalService_serviceId_idx" ON "ProfessionalService"("serviceId");

-- AvailabilityRule: bookingPageId opcional + professionalId
PRAGMA foreign_keys=OFF;
CREATE TABLE "AvailabilityRule_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingPageId" TEXT,
  "professionalId" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  CONSTRAINT "AvailabilityRule_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AvailabilityRule_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "AvailabilityRule_new" ("id", "bookingPageId", "professionalId", "dayOfWeek", "startTime", "endTime")
SELECT "id", "bookingPageId", NULL, "dayOfWeek", "startTime", "endTime" FROM "AvailabilityRule";
DROP TABLE "AvailabilityRule";
ALTER TABLE "AvailabilityRule_new" RENAME TO "AvailabilityRule";
CREATE INDEX "AvailabilityRule_bookingPageId_dayOfWeek_idx" ON "AvailabilityRule"("bookingPageId", "dayOfWeek");
CREATE INDEX "AvailabilityRule_professionalId_dayOfWeek_idx" ON "AvailabilityRule"("professionalId", "dayOfWeek");

CREATE TABLE "AvailabilityException_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bookingPageId" TEXT,
  "professionalId" TEXT,
  "date" TEXT NOT NULL,
  "isBlocked" BOOLEAN NOT NULL DEFAULT true,
  "startTime" TEXT,
  "endTime" TEXT,
  CONSTRAINT "AvailabilityException_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AvailabilityException_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "AvailabilityException_new" ("id", "bookingPageId", "professionalId", "date", "isBlocked", "startTime", "endTime")
SELECT "id", "bookingPageId", NULL, "date", "isBlocked", "startTime", "endTime" FROM "AvailabilityException";
DROP TABLE "AvailabilityException";
ALTER TABLE "AvailabilityException_new" RENAME TO "AvailabilityException";
CREATE INDEX "AvailabilityException_bookingPageId_date_idx" ON "AvailabilityException"("bookingPageId", "date");
CREATE INDEX "AvailabilityException_professionalId_date_idx" ON "AvailabilityException"("professionalId", "date");
PRAGMA foreign_keys=ON;

ALTER TABLE "Booking" ADD COLUMN "professionalId" TEXT;
CREATE INDEX IF NOT EXISTS "Booking_professionalId_startAt_idx" ON "Booking"("professionalId", "startAt");

ALTER TABLE "SlotHold" ADD COLUMN "professionalId" TEXT;
CREATE INDEX IF NOT EXISTS "SlotHold_professionalId_startAt_expiresAt_idx" ON "SlotHold"("professionalId", "startAt", "expiresAt");

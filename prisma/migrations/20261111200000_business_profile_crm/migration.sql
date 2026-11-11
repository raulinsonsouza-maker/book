-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "businessProfile" TEXT NOT NULL DEFAULT 'SALON';
ALTER TABLE "Organization" ADD COLUMN "featureFlags" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "notes" TEXT;

-- CreateTable
CREATE TABLE "VisitNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisitNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VisitNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "authorUserId" TEXT,
    "items" TEXT NOT NULL,
    "notes" TEXT,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prescription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prescription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");
CREATE INDEX "VisitNote_customerId_createdAt_idx" ON "VisitNote"("customerId", "createdAt");
CREATE INDEX "VisitNote_organizationId_createdAt_idx" ON "VisitNote"("organizationId", "createdAt");
CREATE INDEX "VisitNote_bookingId_idx" ON "VisitNote"("bookingId");
CREATE INDEX "Prescription_customerId_issuedAt_idx" ON "Prescription"("customerId", "issuedAt");
CREATE INDEX "Prescription_organizationId_issuedAt_idx" ON "Prescription"("organizationId", "issuedAt");
CREATE INDEX "Prescription_bookingId_idx" ON "Prescription"("bookingId");

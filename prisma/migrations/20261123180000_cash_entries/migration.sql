-- CreateEnum
CREATE TABLE IF NOT EXISTS "CashEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'OTHER',
    "occurredAt" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "customerId" TEXT,
    "bookingId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CashEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CashEntry_organizationId_occurredAt_idx" ON "CashEntry"("organizationId", "occurredAt");
CREATE INDEX "CashEntry_organizationId_type_occurredAt_idx" ON "CashEntry"("organizationId", "type", "occurredAt");
CREATE INDEX "CashEntry_customerId_occurredAt_idx" ON "CashEntry"("customerId", "occurredAt");
CREATE INDEX "CashEntry_bookingId_idx" ON "CashEntry"("bookingId");

-- Service passa a ser da organização (não mais da BookingPage)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
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
    CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Service_intakeProductId_fkey" FOREIGN KEY ("intakeProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Service" (
    "id",
    "organizationId",
    "title",
    "description",
    "imageUrl",
    "durationMinutes",
    "priceCents",
    "caktoOfferId",
    "bufferBefore",
    "bufferAfter",
    "isActive",
    "sortOrder",
    "intakeProductId",
    "createdAt",
    "updatedAt"
)
SELECT
    s."id",
    bp."organizationId",
    s."title",
    s."description",
    s."imageUrl",
    s."durationMinutes",
    s."priceCents",
    s."caktoOfferId",
    s."bufferBefore",
    s."bufferAfter",
    s."isActive",
    s."sortOrder",
    s."intakeProductId",
    s."createdAt",
    s."updatedAt"
FROM "Service" s
INNER JOIN "BookingPage" bp ON bp."id" = s."bookingPageId";

DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";

CREATE INDEX "Service_organizationId_isActive_sortOrder_idx" ON "Service"("organizationId", "isActive", "sortOrder");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

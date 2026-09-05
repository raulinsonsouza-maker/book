-- Junction: página oferece serviços oferecidos
CREATE TABLE "BookingPageService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingPageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BookingPageService_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingPageService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill: cada página recebe todos os serviços da mesma organização
INSERT INTO "BookingPageService" ("id", "bookingPageId", "serviceId", "sortOrder")
SELECT
    lower(hex(randomblob(16))),
    bp."id",
    s."id",
    s."sortOrder"
FROM "BookingPage" bp
INNER JOIN "Service" s ON s."organizationId" = bp."organizationId";

CREATE UNIQUE INDEX "BookingPageService_bookingPageId_serviceId_key" ON "BookingPageService"("bookingPageId", "serviceId");
CREATE INDEX "BookingPageService_serviceId_idx" ON "BookingPageService"("serviceId");
CREATE INDEX "BookingPageService_bookingPageId_sortOrder_idx" ON "BookingPageService"("bookingPageId", "sortOrder");

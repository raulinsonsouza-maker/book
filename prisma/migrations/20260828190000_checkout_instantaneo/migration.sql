-- Checkout instantâneo: Product, CheckoutLink, CheckoutOrder; Payment estendido

CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "caktoOfferId" TEXT,
    "formConfig" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CheckoutLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CheckoutLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CheckoutOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkoutLinkId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerCpf" TEXT,
    "customAnswers" TEXT,
    "holdExpiresAt" DATETIME,
    "paidAt" DATETIME,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CheckoutOrder_checkoutLinkId_fkey" FOREIGN KEY ("checkoutLinkId") REFERENCES "CheckoutLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckoutOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CheckoutLink_slug_key" ON "CheckoutLink"("slug");
CREATE INDEX "Product_organizationId_isActive_idx" ON "Product"("organizationId", "isActive");
CREATE INDEX "CheckoutLink_productId_isActive_idx" ON "CheckoutLink"("productId", "isActive");
CREATE INDEX "CheckoutOrder_checkoutLinkId_status_idx" ON "CheckoutOrder"("checkoutLinkId", "status");
CREATE INDEX "CheckoutOrder_productId_status_idx" ON "CheckoutOrder"("productId", "status");
CREATE INDEX "CheckoutOrder_customerEmail_idx" ON "CheckoutOrder"("customerEmail");
CREATE INDEX "CheckoutOrder_status_holdExpiresAt_idx" ON "CheckoutOrder"("status", "holdExpiresAt");

-- Payment: bookingId opcional + checkoutOrderId
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "checkoutOrderId" TEXT,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "provider" TEXT NOT NULL DEFAULT 'CAKTO',
    "caktoPaymentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "pixQrCode" TEXT,
    "pixQrCodeBase64" TEXT,
    "pixExpiresAt" DATETIME,
    "rawResponse" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_checkoutOrderId_fkey" FOREIGN KEY ("checkoutOrderId") REFERENCES "CheckoutOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Payment" ("id", "bookingId", "method", "status", "amountCents", "currency", "provider", "caktoPaymentId", "idempotencyKey", "pixQrCode", "pixQrCodeBase64", "pixExpiresAt", "rawResponse", "paidAt", "createdAt", "updatedAt")
SELECT "id", "bookingId", "method", "status", "amountCents", "currency", "provider", "caktoPaymentId", "idempotencyKey", "pixQrCode", "pixQrCodeBase64", "pixExpiresAt", "rawResponse", "paidAt", "createdAt", "updatedAt" FROM "Payment";

DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";

CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");
CREATE UNIQUE INDEX "Payment_checkoutOrderId_key" ON "Payment"("checkoutOrderId");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE "PlatformMercadoPagoConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "billingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "clientSecretEncrypted" TEXT,
    "accessTokenEncrypted" TEXT,
    "publicKey" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiry" DATETIME,
    "userId" TEXT,
    "nickname" TEXT,
    "connectedAt" DATETIME,
    "lastError" TEXT,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "PlatformMercadoPagoConfig" ("id", "billingEnabled", "updatedAt")
VALUES ('singleton', 0, CURRENT_TIMESTAMP);

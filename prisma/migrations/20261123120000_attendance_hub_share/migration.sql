-- AlterTable
ALTER TABLE "AttendanceCertificate" ADD COLUMN "customerId" TEXT;
ALTER TABLE "AttendanceCertificate" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "AttendanceCertificate" ADD COLUMN "shareRevokedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceCertificate_shareToken_key" ON "AttendanceCertificate"("shareToken");

-- CreateIndex
CREATE INDEX "AttendanceCertificate_organizationId_customerId_createdAt_idx" ON "AttendanceCertificate"("organizationId", "customerId", "createdAt");

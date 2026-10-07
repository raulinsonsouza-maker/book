-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "attendanceEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "attendanceConfig" TEXT;

-- CreateTable
CREATE TABLE "AttendanceCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "visitDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "issueCity" TEXT NOT NULL,
    "headerSnapshot" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceCertificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AttendanceCertificate_organizationId_createdAt_idx" ON "AttendanceCertificate"("organizationId", "createdAt");

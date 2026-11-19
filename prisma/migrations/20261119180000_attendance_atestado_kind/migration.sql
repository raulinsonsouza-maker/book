-- AlterTable
ALTER TABLE "AttendanceCertificate" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'COMPARECIMENTO';
ALTER TABLE "AttendanceCertificate" ADD COLUMN "title" TEXT;
ALTER TABLE "AttendanceCertificate" ADD COLUMN "bodyText" TEXT;

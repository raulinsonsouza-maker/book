-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "arrivedAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "cancelSource" TEXT;

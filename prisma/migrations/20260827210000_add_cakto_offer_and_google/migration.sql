-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "caktoOfferId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "googleAccessToken" TEXT;
ALTER TABLE "Organization" ADD COLUMN "googleRefreshToken" TEXT;
ALTER TABLE "Organization" ADD COLUMN "googleTokenExpiry" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "googleEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "googleCalendarId" TEXT DEFAULT 'primary';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "googleEventId" TEXT;

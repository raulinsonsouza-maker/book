-- AlterTable Organization: communication prefs
ALTER TABLE "Organization" ADD COLUMN "notifyClientConfirmation" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "notifyClientReminder" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "notifyClientFeedback" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "notifyProNewBooking" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "notifyProCancellation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "notifyProReschedule" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24;

-- AlterTable Booking
ALTER TABLE "Booking" ADD COLUMN "googleMeetLink" TEXT;
ALTER TABLE "Booking" ADD COLUMN "manageToken" TEXT;
ALTER TABLE "Booking" ADD COLUMN "reminderSentAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "feedbackSentAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "pixReminderSentAt" DATETIME;

CREATE UNIQUE INDEX "Booking_manageToken_key" ON "Booking"("manageToken");
CREATE INDEX "Booking_status_startAt_idx" ON "Booking"("status", "startAt");

-- CreateTable BookingEventLog
CREATE TABLE "BookingEventLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingEventLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingEventLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BookingEventLog_bookingId_type_dedupeKey_key" ON "BookingEventLog"("bookingId", "type", "dedupeKey");
CREATE INDEX "BookingEventLog_organizationId_createdAt_idx" ON "BookingEventLog"("organizationId", "createdAt");
CREATE INDEX "BookingEventLog_type_createdAt_idx" ON "BookingEventLog"("type", "createdAt");

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "metaPixelId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "metaCapiAccessToken" TEXT;
ALTER TABLE "Organization" ADD COLUMN "googleAdsSendTo" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "gclid" TEXT;
ALTER TABLE "Booking" ADD COLUMN "fbclid" TEXT;
ALTER TABLE "Booking" ADD COLUMN "fbc" TEXT;
ALTER TABLE "Booking" ADD COLUMN "fbp" TEXT;

-- AlterTable
ALTER TABLE "CheckoutOrder" ADD COLUMN "gclid" TEXT;
ALTER TABLE "CheckoutOrder" ADD COLUMN "fbclid" TEXT;
ALTER TABLE "CheckoutOrder" ADD COLUMN "fbc" TEXT;
ALTER TABLE "CheckoutOrder" ADD COLUMN "fbp" TEXT;

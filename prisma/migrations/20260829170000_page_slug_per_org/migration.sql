-- Slug da agenda passa a ser único por organização (multi-tenant).
-- Duas empresas podem ter /p/empresa-a/consultoria e /p/empresa-b/consultoria.

PRAGMA foreign_keys=OFF;
-- SQLite: drop unique on slug by recreating is heavy; Prisma maps @@unique as index.
-- Remove old unique index if present, add composite unique.
DROP INDEX IF EXISTS "BookingPage_slug_key";
CREATE UNIQUE INDEX "BookingPage_organizationId_slug_key" ON "BookingPage"("organizationId", "slug");
PRAGMA foreign_keys=ON;

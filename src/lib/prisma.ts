import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  sqliteConfigured?: boolean;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** SQLite em produção: WAL + busy_timeout reduzem 502/lock em escritas concorrentes. */
async function configureSqlite() {
  if (globalForPrisma.sqliteConfigured) return;
  if (!process.env.DATABASE_URL?.startsWith("file:")) return;
  globalForPrisma.sqliteConfigured = true;
  try {
    // journal_mode returns a row — use queryRaw, not executeRaw
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL");
    // Evita travar o event loop / healthcheck por 30s em lock de SQLite.
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000");
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON");
  } catch (e) {
    console.error("[prisma] sqlite pragma", e);
  }
}

void configureSqlite();

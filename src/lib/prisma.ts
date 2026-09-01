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
    await prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL");
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout=30000");
  } catch (e) {
    console.error("[prisma] sqlite pragma", e);
  }
}

void configureSqlite();

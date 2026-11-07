import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSafeDatabaseUrl(): string | undefined {
  const urlStr = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!urlStr) return undefined;
  try {
    const url = new URL(urlStr);
    const limit = url.searchParams.get("connection_limit");
    if (!limit || limit === "1") {
      url.searchParams.set("connection_limit", "15");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    return urlStr;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getSafeDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

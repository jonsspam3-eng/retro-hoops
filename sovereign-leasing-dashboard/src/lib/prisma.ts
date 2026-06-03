import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function buildPrismaClient(): PrismaClient | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return undefined;
  }

  const adapter = new PrismaPg(url);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const prismaClient = globalForPrisma.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production" && prismaClient) {
  globalForPrisma.prisma = prismaClient;
}

export const prisma: PrismaClient =
  prismaClient ??
  new Proxy({} as PrismaClient, {
    get() {
      throw new Error("DATABASE_URL is not configured. Prisma client is unavailable.");
    },
  });

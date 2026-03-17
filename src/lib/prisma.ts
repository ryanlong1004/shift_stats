import { PrismaClient } from "@prisma/client";

declare global {
  var __shiftstatsPrisma: PrismaClient | undefined;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrismaClient() {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!global.__shiftstatsPrisma) {
    global.__shiftstatsPrisma = new PrismaClient();
  }

  return global.__shiftstatsPrisma;
}

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient | undefined;
}

const isDatabaseConfigured = Boolean(
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('placeholder') &&
  !process.env.DATABASE_URL.includes('localhost:5432')
);

let prisma: PrismaClient;

if (!isDatabaseConfigured) {
  // In development/preview without a live DB, instantiate with fallback or dummy URL to avoid immediate crash
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/watech_bi?schema=public';
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = global.cachedPrisma;
}

export { prisma, isDatabaseConfigured };
export default prisma;

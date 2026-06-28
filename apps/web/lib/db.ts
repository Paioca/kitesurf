import { PrismaClient } from '@prisma/client';
import { prismaRuntimeDatabaseUrl } from './db-url';

// Singleton do Prisma — evita esgotar conexões em serverless/hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const url = prismaRuntimeDatabaseUrl();
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = db;

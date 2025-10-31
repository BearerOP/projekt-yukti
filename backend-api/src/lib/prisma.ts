import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient Singleton
 * 
 * This ensures we have a single instance of PrismaClient throughout the application.
 * Multiple instances can cause issues with connection pooling and performance.
 */

// Declare global type for PrismaClient to avoid TypeScript errors
declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Create or reuse PrismaClient instance
 * 
 * In development: Reuses the same client across hot reloads
 * In production: Creates a new client
 */
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// In development, store the client in global to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Graceful shutdown
 * Properly disconnect from database when the process terminates
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
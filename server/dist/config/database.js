import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';
export const prisma = new PrismaClient({
    log: ENV.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
export async function checkDatabaseConnection() {
    try {
        await prisma.$queryRaw `SELECT 1`;
        console.log('[POLAR COMMAND DB] Database connection verified successfully.');
        return true;
    }
    catch (error) {
        console.error('[POLAR COMMAND DB] Failed to connect to database:', error);
        return false;
    }
}

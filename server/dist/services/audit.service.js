import { prisma } from '../config/database.js';
export class AuditService {
    static async record(params) {
        try {
            return await prisma.auditLog.create({
                data: {
                    expeditionId: params.expeditionId,
                    userId: params.userId,
                    userName: params.userName || 'Commander System',
                    userRole: params.userRole || 'COMMANDER',
                    action: params.action,
                    entity: params.entity,
                    entityId: params.entityId,
                    previousStateJson: params.previousState ? JSON.stringify(params.previousState) : null,
                    newStateJson: params.newState ? JSON.stringify(params.newState) : null,
                    reason: params.reason || null,
                },
            });
        }
        catch (err) {
            console.error('[AUDIT SERVICE] Failed to write audit entry:', err);
        }
    }
    static async getRecentActivity(expeditionId, limit = 20) {
        const where = expeditionId ? { expeditionId } : {};
        return prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: {
                user: {
                    select: { id: true, name: true, role: true, email: true },
                },
            },
        });
    }
}

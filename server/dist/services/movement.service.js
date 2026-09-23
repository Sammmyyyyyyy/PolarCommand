import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
export class MovementService {
    static async listMovements(expeditionId, status) {
        const where = { expeditionId };
        if (status && status !== 'All')
            where.status = status;
        return prisma.movement.findMany({
            where,
            include: {
                personnelRoster: {
                    include: { personnel: true },
                },
                cargoManifest: {
                    include: { cargo: true },
                },
            },
            orderBy: { departureTime: 'desc' },
        });
    }
    static async getMovement(id) {
        return prisma.movement.findUnique({
            where: { id },
            include: {
                personnelRoster: { include: { personnel: true } },
                cargoManifest: { include: { cargo: true } },
            },
        });
    }
    static async createMovement(expeditionId, data, user) {
        const movement = await prisma.movement.create({
            data: {
                expeditionId,
                fromLocation: data.fromLocation,
                toLocation: data.toLocation,
                departureTime: new Date(data.departureTime || Date.now()),
                eta: new Date(data.eta || Date.now() + 86400000 * 3),
                transportMode: data.transportMode || 'Snow Vehicle',
                status: data.status || 'Scheduled',
                currentLat: data.currentLat ? Number(data.currentLat) : null,
                currentLng: data.currentLng ? Number(data.currentLng) : null,
                notes: data.notes || null,
            },
        });
        // Relational join links for personnel
        if (data.personnelIds && Array.isArray(data.personnelIds)) {
            for (const pId of data.personnelIds) {
                await prisma.movementPersonnel.create({
                    data: {
                        movementId: movement.id,
                        personnelId: pId,
                    },
                });
            }
        }
        // Relational join links for cargo
        if (data.cargoIds && Array.isArray(data.cargoIds)) {
            for (const cId of data.cargoIds) {
                await prisma.movementCargo.create({
                    data: {
                        movementId: movement.id,
                        cargoId: cId,
                    },
                });
            }
        }
        await AuditService.record({
            expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'CREATE_MOVEMENT',
            entity: 'Movement',
            entityId: movement.id,
            reason: `Logged transit movement from ${movement.fromLocation} to ${movement.toLocation} (${movement.transportMode})`,
        });
        return this.getMovement(movement.id);
    }
    static async updateMovementStatus(id, status, user) {
        const prev = await prisma.movement.findUnique({ where: { id } });
        if (!prev)
            throw new Error(`Movement ${id} not found`);
        const updateData = { status };
        if (status === 'Arrived') {
            updateData.actualArrival = new Date();
        }
        const updated = await prisma.movement.update({
            where: { id },
            data: updateData,
        });
        await AuditService.record({
            expeditionId: prev.expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'UPDATE_MOVEMENT_STATUS',
            entity: 'Movement',
            entityId: id,
            previousState: prev.status,
            newState: status,
            reason: `Transit status updated to ${status}`,
        });
        return updated;
    }
}

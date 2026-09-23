import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
export class PersonnelService {
    static async listPersonnel(expeditionId, role, status) {
        const where = { expeditionId };
        if (role && role !== 'All')
            where.role = role;
        if (status && status !== 'All')
            where.status = status;
        return prisma.personnel.findMany({
            where,
            include: {
                assignedStation: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    static async getPersonnel(id) {
        return prisma.personnel.findUnique({
            where: { id },
            include: {
                assignedStation: true,
                assignedIncidents: true,
                assignedActions: true,
                movements: { include: { movement: true } },
            },
        });
    }
    static async createPersonnel(expeditionId, data, user) {
        const person = await prisma.personnel.create({
            data: {
                expeditionId,
                memberId: data.memberId || `PER-${Date.now().toString().slice(-4)}`,
                name: data.name,
                role: data.role || 'Scientist',
                qualification: data.qualification || 'Polar Specialist',
                currentLocation: data.currentLocation || 'Base Station',
                assignedStationId: data.assignedStationId || null,
                emergencyAvailability: data.emergencyAvailability || 'Available',
                contactInfo: data.contactInfo || 'VHF Ch-16 / Iridium Sat-Phone',
                movementSchedule: data.movementSchedule || 'Stationary On-Station',
                status: data.status || 'At Station',
                latitude: data.latitude ? Number(data.latitude) : null,
                longitude: data.longitude ? Number(data.longitude) : null,
            },
            include: { assignedStation: true },
        });
        await AuditService.record({
            expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'CREATE_PERSONNEL',
            entity: 'Personnel',
            entityId: person.id,
            reason: `Inducted ${person.name} (${person.memberId} - ${person.role}) into active expedition roster`,
        });
        return person;
    }
    static async updatePersonnel(id, data, user) {
        const prev = await prisma.personnel.findUnique({ where: { id } });
        if (!prev)
            throw new Error(`Personnel member ${id} not found`);
        const updated = await prisma.personnel.update({
            where: { id },
            data,
            include: { assignedStation: true },
        });
        await AuditService.record({
            expeditionId: prev.expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'UPDATE_PERSONNEL',
            entity: 'Personnel',
            entityId: id,
            previousState: prev.status,
            newState: updated.status,
            reason: `Updated deployment status and location for ${updated.name}`,
        });
        return updated;
    }
    static async deletePersonnel(id, user) {
        const person = await prisma.personnel.findUnique({ where: { id } });
        if (!person)
            throw new Error(`Personnel member ${id} not found`);
        const deleted = await prisma.personnel.delete({ where: { id } });
        await AuditService.record({
            expeditionId: person.expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'DELETE_PERSONNEL',
            entity: 'Personnel',
            entityId: id,
            reason: `Removed ${deleted.name} (${deleted.memberId}) from expedition roster`,
        });
        return deleted;
    }
}

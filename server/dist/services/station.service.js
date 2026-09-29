import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { ScopeService } from './scope.service.js';
export class StationService {
    static async listStations(expeditionId, user) {
        const where = {};
        if (user) {
            const scope = await ScopeService.getUserScope(user);
            if (scope.isStationManager) {
                if (scope.stationIds.length > 0) {
                    where.id = { in: scope.stationIds };
                }
                else if (scope.primaryStationId) {
                    where.id = scope.primaryStationId;
                }
            }
            else if (scope.isExpeditionLeader || scope.isTeamMember) {
                where.OR = [
                    { id: { in: scope.stationIds } },
                    { expeditionId: { in: scope.expeditionIds } },
                ];
            }
        }
        if (expeditionId && expeditionId !== 'all') {
            where.expeditionId = expeditionId;
        }
        return prisma.station.findMany({
            where,
            include: {
                weather: { orderBy: { recordedAt: 'desc' }, take: 1 },
                _count: {
                    select: {
                        personnel: true,
                        assets: true,
                        inventory: true,
                        incidents: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    static async getStation(idOrCode) {
        const clean = idOrCode.replace(/^st-/, '');
        return prisma.station.findFirst({
            where: {
                OR: [
                    { id: idOrCode },
                    { id: clean },
                    { code: idOrCode.toUpperCase() },
                    { code: clean.toUpperCase() },
                    { name: { contains: clean } },
                ],
            },
            include: {
                weather: { orderBy: { recordedAt: 'desc' }, take: 5 },
                personnel: true,
                assets: true,
                inventory: true,
                incidents: { where: { status: { not: 'Resolved' } } },
            },
        });
    }
    static async createStation(expeditionId, data, user) {
        const station = await prisma.station.create({
            data: {
                expeditionId,
                name: data.name,
                code: data.code.toUpperCase(),
                region: data.region || 'East Antarctica',
                latitude: Number(data.latitude),
                longitude: Number(data.longitude),
                capacity: Number(data.capacity) || 30,
                status: data.status || 'Operational',
                currentRisk: Number(data.currentRisk) || 20,
            },
        });
        // Create default weather snapshot
        await prisma.weatherSnapshot.create({
            data: {
                stationId: station.id,
                temperature: Number(data.temperature) || -18.5,
                windSpeedKnots: Number(data.windSpeedKnots) || 24,
                condition: data.condition || 'Partly Cloudy',
                visibility: data.visibility || '12 km (Clear)',
            },
        });
        await AuditService.record({
            expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'CREATE_STATION',
            entity: 'Station',
            entityId: station.id,
            reason: `Commissioned polar base station ${station.name} (${station.code})`,
        });
        return this.getStation(station.id);
    }
    static async recordWeather(stationId, weatherData) {
        return prisma.weatherSnapshot.create({
            data: {
                stationId,
                temperature: Number(weatherData.temperature),
                windSpeedKnots: Number(weatherData.windSpeedKnots),
                condition: weatherData.condition || 'Clear',
                visibility: weatherData.visibility || '10 km',
            },
        });
    }
}

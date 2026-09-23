import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';

export class StationService {
  public static async listStations(expeditionId: string) {
    return prisma.station.findMany({
      where: { expeditionId },
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

  public static async getStation(id: string) {
    return prisma.station.findUnique({
      where: { id },
      include: {
        weather: { orderBy: { recordedAt: 'desc' }, take: 5 },
        personnel: true,
        assets: true,
        inventory: true,
        incidents: { where: { status: { not: 'Resolved' } } },
      },
    });
  }

  public static async createStation(expeditionId: string, data: any, user?: any) {
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

  public static async recordWeather(stationId: string, weatherData: any) {
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

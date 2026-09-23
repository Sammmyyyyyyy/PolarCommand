import { prisma } from '../config/database.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';

export interface CreateExpeditionInput {
  code: string;
  title: string;
  type: string;
  missionObjective: string;
  commanderId?: string;
  commanderName?: string;
  startDate: string | Date;
  endDate: string | Date;
  origin: string;
  destination: string;
  intermediateHubs?: string;
  transportModes?: string;
  priority?: string;
  notes?: string;
  initialStations?: Array<{
    name: string;
    code: string;
    region: string;
    latitude: number;
    longitude: number;
    capacity?: number;
  }>;
}

export class ExpeditionService {
  public static async listExpeditions() {
    return prisma.expedition.findMany({
      include: {
        commander: { select: { id: true, name: true, role: true, email: true } },
        stations: true,
        _count: {
          select: {
            personnel: true,
            cargo: true,
            inventory: true,
            assets: true,
            incidents: true,
            alerts: { where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'] } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async getExpedition(idOrCode: string) {
    return prisma.expedition.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
      include: {
        commander: { select: { id: true, name: true, role: true, email: true } },
        stations: {
          include: {
            weather: { orderBy: { recordedAt: 'desc' }, take: 1 },
          },
        },
        _count: {
          select: {
            personnel: true,
            cargo: true,
            inventory: true,
            assets: true,
            incidents: true,
            alerts: true,
            movements: true,
          },
        },
      },
    });
  }

  public static async createExpedition(input: CreateExpeditionInput, user?: any) {
    const existing = await prisma.expedition.findUnique({ where: { code: input.code } });
    if (existing) {
      throw new Error(`Expedition with code ${input.code} already exists`);
    }

    const expedition = await prisma.expedition.create({
      data: {
        code: input.code.toUpperCase(),
        title: input.title,
        type: input.type,
        missionObjective: input.missionObjective,
        commanderId: input.commanderId || user?.id || null,
        commanderName: input.commanderName || user?.name || 'Commander',
        status: 'ACTIVE',
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        origin: input.origin,
        destination: input.destination,
        intermediateHubs: input.intermediateHubs || null,
        transportModes: input.transportModes || 'Vessel, Air, Snow Vehicle',
        priority: input.priority || 'HIGH',
        notes: input.notes || null,
        overallRiskScore: 25,
      },
    });

    // Optionally create initial stations if provided
    if (input.initialStations && input.initialStations.length > 0) {
      for (const st of input.initialStations) {
        await prisma.station.create({
          data: {
            expeditionId: expedition.id,
            name: st.name,
            code: st.code,
            region: st.region,
            latitude: st.latitude,
            longitude: st.longitude,
            capacity: st.capacity || 30,
            status: 'Operational',
            currentRisk: 20,
          },
        });
      }
    }

    // Seed baseline risk snapshot
    await RiskService.calculateAndRecordExpeditionRisk(expedition.id);

    await AuditService.record({
      expeditionId: expedition.id,
      userId: user?.id,
      userName: user?.name || 'Mission Controller',
      userRole: user?.role || 'ADMIN',
      action: 'CREATE_EXPEDITION',
      entity: 'Expedition',
      entityId: expedition.id,
      reason: `Commissioned new polar expedition ${expedition.code}`,
    });

    return this.getExpedition(expedition.id);
  }

  public static async updateExpedition(id: string, data: Partial<CreateExpeditionInput>, user?: any) {
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    delete updateData.initialStations;

    const updated = await prisma.expedition.update({
      where: { id },
      data: updateData,
    });

    await AuditService.record({
      expeditionId: id,
      userId: user?.id,
      userName: user?.name || 'Commander',
      userRole: user?.role || 'COMMANDER',
      action: 'UPDATE_EXPEDITION',
      entity: 'Expedition',
      entityId: id,
      reason: 'Updated expedition configuration and operational parameters',
    });

    return updated;
  }

  public static async deleteExpedition(id: string, user?: any) {
    const deleted = await prisma.expedition.delete({ where: { id } });
    await AuditService.record({
      userId: user?.id,
      userName: user?.name || 'Administrator',
      userRole: user?.role || 'ADMIN',
      action: 'DELETE_EXPEDITION',
      entity: 'Expedition',
      entityId: id,
      reason: `Decommissioned and deleted expedition ${deleted.code}`,
    });
    return deleted;
  }

  public static async getDashboardSummary(expeditionId: string) {
    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        commander: { select: { id: true, name: true, role: true, email: true } },
        stations: {
          include: {
            weather: { orderBy: { recordedAt: 'desc' }, take: 1 },
          },
        },
        cargo: true,
        inventory: { include: { station: true } },
        assets: { include: { station: true } },
        personnel: true,
        incidents: { where: { status: { not: 'Resolved' } } },
        alerts: { orderBy: { createdAt: 'desc' }, take: 6 },
      },
    });

    if (!expedition) {
      throw new Error(`Expedition ${expeditionId} not found`);
    }

    // Calculations
    const personnelCount = expedition.personnel.length;
    const personnelInTransit = expedition.personnel.filter((p) => p.status === 'In Transit').length;

    const totalCargo = expedition.cargo.length;
    const delayedCargo = expedition.cargo.filter((c) => c.status === 'Delayed' || c.delayHours > 0).length;
    const inTransitCargo = expedition.cargo.filter((c) => c.status === 'In Transit').length;

    const totalAssets = expedition.assets.length;
    const operationalAssets = expedition.assets.filter((a) => a.status === 'Operational').length;
    const maintenanceDueAssets = expedition.assets.filter(
      (a) => a.maintenanceInterval - a.operatingHours <= 0 || a.status === 'Maintenance'
    ).length;

    const totalInventory = expedition.inventory.length;
    const inventoryAtRisk = expedition.inventory.filter((inv) => {
      const daily = inv.dailyUsage > 0 ? inv.dailyUsage : 1;
      return inv.currentStock / daily <= inv.safetyThresholdDays;
    }).length;

    const inventoryReadiness = totalInventory > 0
      ? Math.round(((totalInventory - inventoryAtRisk) / totalInventory) * 100)
      : 100;

    const activeAlerts = expedition.alerts.filter((a) => a.status !== 'RESOLVED').length;

    const risk = await RiskService.calculateAndRecordExpeditionRisk(expeditionId);

    // Recent activity stream
    const recentActivity = await AuditService.getRecentActivity(expeditionId, 10);

    return {
      expedition,
      kpi: {
        personnel: personnelCount,
        personnelInTransit,
        cargoShipments: totalCargo,
        delayedCargoCount: delayedCargo,
        inTransitCargoCount: inTransitCargo,
        assets: totalAssets,
        operationalAssetsCount: operationalAssets,
        maintenanceDueAssetsCount: maintenanceDueAssets,
        inventoryReadiness,
        inventoryItemsAtRisk: inventoryAtRisk,
        activeAlerts,
        overallRisk: risk.totalScore,
        riskLevel: risk.riskLevel,
        riskBreakdown: risk.breakdown,
        contributingFactors: risk.contributingFactors,
        recommendedMitigation: risk.recommendedMitigation,
      },
      stationsSummary: expedition.stations.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        status: s.status,
        currentRisk: s.currentRisk,
        weather: s.weather[0] || null,
      })),
      alerts: expedition.alerts,
      recentActivity,
    };
  }
}

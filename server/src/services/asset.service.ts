import { prisma } from '../config/database.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';

export class AssetService {
  public static async listAssets(expeditionId: string, type?: string, stationId?: string) {
    const where: any = { expeditionId };
    if (type && type !== 'All') where.type = type;
    if (stationId && stationId !== 'All') where.stationId = stationId;

    const assets = await prisma.asset.findMany({
      where,
      include: { station: true },
      orderBy: { name: 'asc' },
    });

    return assets.map((a) => {
      const remainingHours = a.maintenanceInterval - a.operatingHours;
      const maintenanceStatus =
        a.status === 'Unavailable' || a.status === 'Critical'
          ? 'Unavailable'
          : remainingHours <= 0
          ? 'Maintenance Due'
          : remainingHours <= 200
          ? 'Maintenance Due Soon'
          : 'Healthy';

      return {
        ...a,
        remainingHours,
        maintenanceStatus,
      };
    });
  }

  public static async createAsset(expeditionId: string, data: any, user?: any) {
    const asset = await prisma.asset.create({
      data: {
        expeditionId,
        assetCode: data.assetCode || `AST-${Date.now().toString().slice(-4)}`,
        name: data.name,
        type: data.type || 'Snow Vehicle',
        stationId: data.stationId,
        currentCondition: data.currentCondition || 'Good',
        operatingHours: Number(data.operatingHours) || 0,
        maintenanceInterval: Number(data.maintenanceInterval) || 2000,
        lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : new Date(),
        healthPercentage: Number(data.healthPercentage) || 100,
        failureRisk: data.failureRisk || 'Low',
        status: data.status || 'Operational',
        diagnosticNotes: data.diagnosticNotes || null,
      },
      include: { station: true },
    });

    await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
    await AlertService.evaluateAndSyncAlerts(expeditionId);

    await AuditService.record({
      expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'CREATE_ASSET',
      entity: 'Asset',
      entityId: asset.id,
      reason: `Registered new station equipment ${asset.name} (${asset.assetCode}) at ${asset.station.name}`,
    });

    return asset;
  }

  public static async updateAsset(id: string, data: any, user?: any) {
    const prev = await prisma.asset.findUnique({ where: { id }, include: { station: true } });
    if (!prev) throw new Error(`Asset ${id} not found`);

    const updateData: any = { ...data };
    if (data.operatingHours !== undefined) updateData.operatingHours = Number(data.operatingHours);
    if (data.maintenanceInterval !== undefined) updateData.maintenanceInterval = Number(data.maintenanceInterval);
    if (data.healthPercentage !== undefined) updateData.healthPercentage = Number(data.healthPercentage);

    const updated = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: { station: true },
    });

    await RiskService.calculateAndRecordExpeditionRisk(prev.expeditionId);
    await AlertService.evaluateAndSyncAlerts(prev.expeditionId);

    await AuditService.record({
      expeditionId: prev.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'UPDATE_ASSET',
      entity: 'Asset',
      entityId: id,
      previousState: prev.status,
      newState: updated.status,
      reason: `Updated asset condition and parameters for ${updated.name}`,
    });

    return updated;
  }

  public static async deleteAsset(id: string, user?: any) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new Error(`Asset ${id} not found`);

    const deleted = await prisma.asset.delete({ where: { id } });
    await RiskService.calculateAndRecordExpeditionRisk(asset.expeditionId);
    await AlertService.evaluateAndSyncAlerts(asset.expeditionId);

    await AuditService.record({
      expeditionId: asset.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DELETE_ASSET',
      entity: 'Asset',
      entityId: id,
      reason: `Decommissioned asset ${deleted.name}`,
    });

    return deleted;
  }

  public static async recordMaintenance(id: string, user?: any) {
    const asset = await prisma.asset.findUnique({ where: { id }, include: { station: true } });
    if (!asset) throw new Error(`Asset ${id} not found`);

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        operatingHours: 0,
        healthPercentage: 100,
        lastMaintenanceDate: new Date(),
        status: 'Operational',
        failureRisk: 'Low',
        currentCondition: 'Good',
      },
    });

    // Resolve any linked maintenance alerts
    await prisma.alert.updateMany({
      where: {
        expeditionId: asset.expeditionId,
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        affectedEntity: { contains: asset.assetCode },
      },
      data: { status: 'RESOLVED' },
    });

    await RiskService.calculateAndRecordExpeditionRisk(asset.expeditionId);
    await AlertService.evaluateAndSyncAlerts(asset.expeditionId);

    await AuditService.record({
      expeditionId: asset.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'RECORD_MAINTENANCE',
      entity: 'Asset',
      entityId: id,
      reason: `Logged completed maintenance service overhaul for ${asset.name}; reset operating counter`,
    });

    return updated;
  }
}

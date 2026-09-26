import { prisma } from '../config/database.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';

export class AssetService {
  public static async listAssets(expeditionId?: string, type?: string, stationId?: string, organizationId?: string) {
    const where: any = {};
    if (expeditionId) where.expeditionId = expeditionId;
    if (organizationId) where.organizationId = organizationId;
    if (type && type !== 'All') where.type = type;
    if (stationId && stationId !== 'All') where.stationId = stationId;

    const assets = await prisma.asset.findMany({
      where,
      include: {
        station: true,
        assignedPersonnel: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        tasks: { where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } },
      },
      orderBy: { name: 'asc' },
    });

    return assets.map((a) => {
      const remainingHours = a.maintenanceInterval - a.operatingHours;
      const maintenanceStatus =
        a.lifecycleStatus === 'FAILED' || a.status === 'Unavailable' || a.status === 'Critical'
          ? 'Unavailable'
          : a.lifecycleStatus === 'UNDER_MAINTENANCE'
          ? 'Under Maintenance'
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

  public static async getAsset(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        station: true,
        assignedPersonnel: true,
        assignedUser: true,
        tasks: true,
      },
    });
    return asset;
  }

  /**
   * Explicit equipment assignment for Expedition Leader
   */
  public static async assignEquipment(assetId: string, personnelId: string, user: any) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { station: true },
    });
    if (!asset) throw new Error(`Equipment ${assetId} not found`);

    const personnel = await prisma.personnel.findUnique({
      where: { id: personnelId },
      include: { assignedUserLink: true },
    });
    if (!personnel) throw new Error(`Personnel ${personnelId} not found`);

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: {
        assignedPersonnelId: personnel.id,
        assignedUserId: personnel.assignedUserLink?.id || null,
        assignedDate: new Date(),
        lifecycleStatus: 'ASSIGNED',
        status: asset.status === 'Unavailable' ? asset.status : 'Operational',
      },
      include: {
        station: true,
        assignedPersonnel: true,
        assignedUser: true,
      },
    });

    await AuditService.record({
      expeditionId: asset.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'ASSIGN_EQUIPMENT',
      entity: 'Asset',
      entityId: asset.id,
      reason: `Assigned equipment ${asset.name} (${asset.assetCode}) to ${personnel.name} (${personnel.role})`,
    });

    return updated;
  }

  /**
   * Unassign equipment
   */
  public static async unassignEquipment(assetId: string, user: any) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { assignedPersonnel: true },
    });
    if (!asset) throw new Error(`Equipment ${assetId} not found`);

    const prevAssignee = asset.assignedPersonnel?.name || 'Unassigned';

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: {
        assignedPersonnelId: null,
        assignedUserId: null,
        assignedDate: null,
        lifecycleStatus: 'AVAILABLE',
      },
      include: {
        station: true,
        assignedPersonnel: true,
      },
    });

    await AuditService.record({
      expeditionId: asset.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'UNASSIGN_EQUIPMENT',
      entity: 'Asset',
      entityId: asset.id,
      reason: `Unassigned equipment ${asset.name} (${asset.assetCode}) from ${prevAssignee}`,
    });

    return updated;
  }

  /**
   * List equipment assigned to a specific personnel member (My Equipment)
   */
  public static async listEquipmentForPersonnel(personnelId: string) {
    return prisma.asset.findMany({
      where: { assignedPersonnelId: personnelId },
      include: { station: true },
      orderBy: { name: 'asc' },
    });
  }

  public static async createAsset(expeditionId: string, data: any, user?: any) {
    const asset = await prisma.asset.create({
      data: {
        expeditionId,
        organizationId: data.organizationId || null,
        assetCode: data.assetCode || `AST-${Date.now().toString().slice(-4)}`,
        name: data.name,
        type: data.type || 'Scientific Equipment',
        stationId: data.stationId,
        currentCondition: data.currentCondition || 'Good',
        operatingHours: Number(data.operatingHours) || 0,
        maintenanceInterval: Number(data.maintenanceInterval) || 2000,
        lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : new Date(),
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null,
        healthPercentage: Number(data.healthPercentage) || 100,
        failureRisk: data.failureRisk || 'Low',
        status: data.status || 'Operational',
        lifecycleStatus: data.lifecycleStatus || 'AVAILABLE',
        diagnosticNotes: data.diagnosticNotes || null,
        serialNumber: data.serialNumber || null,
        batteryPercentage: Number(data.batteryPercentage ?? 100),
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
      reason: `Registered new equipment ${asset.name} (${asset.assetCode}) at ${asset.station.name}`,
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
    if (data.batteryPercentage !== undefined) updateData.batteryPercentage = Number(data.batteryPercentage);

    const updated = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: { station: true, assignedPersonnel: true },
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
      previousState: prev.lifecycleStatus,
      newState: updated.lifecycleStatus,
      reason: `Updated asset parameters for ${updated.name}`,
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
        lifecycleStatus: 'AVAILABLE',
        failureRisk: 'Low',
        currentCondition: 'Good',
      },
      include: { station: true },
    });

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

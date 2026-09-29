import { prisma } from '../config/database.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';
import { ScopeService } from './scope.service.js';

export class AssetService {
  public static async listAssets(
    expeditionId?: string,
    type?: string,
    stationId?: string,
    organizationId?: string,
    user?: any
  ) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (type && type !== 'All') where.type = type;

    if (user) {
      const scope = await ScopeService.getUserScope(user);
      if (scope.isStationManager) {
        // Section 17: Station Manager must ONLY see equipment belonging to their assigned station
        if (scope.stationIds.length > 0) {
          where.stationId = { in: scope.stationIds };
        } else if (scope.primaryStationId) {
          where.stationId = scope.primaryStationId;
        }
      } else if (scope.isExpeditionLeader) {
        if (scope.expeditionIds.length > 0) {
          where.expeditionId = { in: scope.expeditionIds };
        }
      } else if (scope.isTeamMember) {
        if (scope.expeditionIds.length > 0) {
          where.expeditionId = { in: scope.expeditionIds };
        }
      } else if (stationId && stationId !== 'All') {
        // Admin or Logistics Commander can specify station
        const st = await prisma.station.findFirst({
          where: {
            OR: [{ id: stationId }, { code: stationId.toUpperCase() }, { name: { contains: stationId } }],
          },
        });
        if (st) where.stationId = st.id;
        else where.stationId = stationId;
      }
    } else {
      if (stationId && stationId !== 'All') {
        const st = await prisma.station.findFirst({
          where: {
            OR: [{ id: stationId }, { code: stationId.toUpperCase() }, { name: { contains: stationId } }],
          },
        });
        if (st) where.stationId = st.id;
        else where.stationId = stationId;
      }
      if (expeditionId) where.expeditionId = expeditionId;
    }

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

  /**
   * Create asset with automatic station scope resolution and robust validation
   */
  public static async createAsset(expeditionId: string | undefined, data: any, user?: any) {
    const scope = await ScopeService.getUserScope(user);

    // Section 17 & 41: When Station Manager creates equipment, automatically assign: stationId = loggedInUser.stationId
    let resolvedStationId = data.stationId;
    if (scope.isStationManager) {
      resolvedStationId = scope.primaryStationId || user?.stationId;
    }

    if (!resolvedStationId && scope.primaryStationId) {
      resolvedStationId = scope.primaryStationId;
    }

    // Lookup station by UUID, code, or name to guarantee valid foreign key
    let targetStation: any = null;
    if (resolvedStationId) {
      targetStation = await prisma.station.findFirst({
        where: {
          OR: [
            { id: resolvedStationId },
            { code: resolvedStationId.toUpperCase() },
            { name: { contains: resolvedStationId } },
          ],
        },
      });
    }

    if (!targetStation) {
      if (scope.stationIds.length > 0) {
        targetStation = await prisma.station.findUnique({ where: { id: scope.stationIds[0] } });
      } else {
        targetStation = await prisma.station.findFirst();
      }
    }

    if (!targetStation) {
      throw new Error('Unable to create equipment: No polar research station found to link this asset.');
    }

    // Resolve expeditionId
    let targetExpeditionId = expeditionId || data.expeditionId;
    if (targetExpeditionId) {
      const exp = await prisma.expedition.findFirst({
        where: {
          OR: [{ id: targetExpeditionId }, { code: targetExpeditionId }],
        },
      });
      if (exp) targetExpeditionId = exp.id;
    }

    if (!targetExpeditionId && targetStation.expeditionId) {
      targetExpeditionId = targetStation.expeditionId;
    }
    if (!targetExpeditionId) {
      const anyExp = await prisma.expedition.findFirst();
      targetExpeditionId = anyExp?.id;
    }

    if (!targetExpeditionId) {
      throw new Error('Unable to create equipment: No active expedition found.');
    }

    const asset = await prisma.asset.create({
      data: {
        expeditionId: targetExpeditionId,
        organizationId: data.organizationId || targetStation.organizationId || null,
        assetCode: data.assetCode || `AST-${Date.now().toString().slice(-4)}`,
        name: data.name || 'Polar Asset Unit',
        type: data.type || 'Scientific Equipment',
        stationId: targetStation.id,
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

    await RiskService.calculateAndRecordExpeditionRisk(targetExpeditionId);
    await AlertService.evaluateAndSyncAlerts(targetExpeditionId);

    await AuditService.record({
      expeditionId: targetExpeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'CREATE_ASSET',
      entity: 'Asset',
      entityId: asset.id,
      reason: `Registered new equipment ${asset.name} (${asset.assetCode}) at ${targetStation.name}`,
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
      entityId: updated.id,
      reason: `Updated operational status of ${updated.name} to ${updated.status}`,
    });

    return updated;
  }

  public static async recordMaintenance(id: string, notes?: string, user?: any) {
    const prev = await prisma.asset.findUnique({ where: { id }, include: { station: true } });
    if (!prev) throw new Error(`Asset ${id} not found`);

    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 90);

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        operatingHours: 0,
        healthPercentage: 100,
        currentCondition: 'Good',
        failureRisk: 'Low',
        status: 'Operational',
        lifecycleStatus: 'AVAILABLE',
        lastMaintenanceDate: new Date(),
        nextMaintenanceDate: nextDue,
        diagnosticNotes: notes || `Scheduled depot inspection performed. Zero mechanical defects recorded.`,
      },
      include: { station: true },
    });

    await RiskService.calculateAndRecordExpeditionRisk(prev.expeditionId);
    await AlertService.evaluateAndSyncAlerts(prev.expeditionId);

    await AuditService.record({
      expeditionId: prev.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'ASSET_MAINTENANCE',
      entity: 'Asset',
      entityId: updated.id,
      reason: `Maintenance certified for ${updated.name} at ${prev.station.name}`,
    });

    return updated;
  }

  public static async deleteAsset(id: string, user?: any) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new Error(`Asset ${id} not found`);

    await prisma.asset.delete({ where: { id } });

    await RiskService.calculateAndRecordExpeditionRisk(asset.expeditionId);

    await AuditService.record({
      expeditionId: asset.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DELETE_ASSET',
      entity: 'Asset',
      entityId: id,
      reason: `Decommissioned asset ${asset.name} (${asset.assetCode})`,
    });

    return { success: true };
  }
}

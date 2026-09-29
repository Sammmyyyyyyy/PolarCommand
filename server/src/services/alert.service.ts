import { prisma } from '../config/database.js';
import { ScopeService } from './scope.service.js';

export interface CreateAlertInput {
  type?: string;
  severity?: string;
  title: string;
  message?: string;
  source?: string;
  affectedEntity?: string;
  reason?: string;
  impact?: string;
  recommendedAction?: string;
  status?: string;
  createdBy?: string;
  personnelId?: string;
  stationId?: string;
  expeditionId?: string;
  recipients?: string[];
}

export class AlertService {
  /**
   * Automated background evaluator: checks inventory, cargo, assets
   */
  public static async evaluateAndSyncAlerts(expeditionId: string): Promise<any[]> {
    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        cargo: true,
        inventory: { include: { station: true } },
        assets: { include: { station: true } },
        incidents: { where: { status: { not: 'Resolved' } } },
        stations: true,
      },
    });

    if (!expedition) return [];

    const existingAlerts = await prisma.alert.findMany({
      where: { expeditionId, status: { in: ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
    });

    // 1. Evaluate Cargo Delays
    for (const c of expedition.cargo) {
      if (c.delayHours > 0 || c.status === 'Delayed') {
        const title = `Cargo ${c.cargoCode} delayed by ${c.delayHours}h`;
        const alreadyExists = existingAlerts.some((a) => a.affectedEntity === c.cargoCode);

        if (!alreadyExists) {
          await this.createAlert({
            expeditionId,
            type: 'SHIPMENT',
            severity: c.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            title,
            source: 'Maritime & Air Corridor Tracker',
            affectedEntity: c.cargoCode,
            reason: `Shipment ${c.description} delayed by ${c.delayHours}h en route to ${c.destination}.`,
            impact: `Delivery pushed back to ${c.eta.toISOString().slice(0, 10)}. Potential stockout downstream.`,
            recommendedAction: 'Expedite transit or reallocate emergency buffer supplies from nearest base.',
            status: 'ACTIVE',
          });
        }
      }
    }

    // 2. Evaluate Inventory Threshold Breaches
    for (const inv of expedition.inventory) {
      const daily = inv.dailyUsage > 0 ? inv.dailyUsage : 1;
      const daysOfSupply = inv.currentStock / daily;

      if (daysOfSupply <= inv.safetyThresholdDays) {
        const entityKey = `${inv.station.name} - ${inv.itemName}`;
        const alreadyExists = existingAlerts.some(
          (a) => a.affectedEntity.includes(inv.itemName) && a.affectedEntity.includes(inv.station.name)
        );

        if (!alreadyExists) {
          const isCritical = inv.category.toLowerCase().includes('med') || inv.category.toLowerCase().includes('fuel');
          await this.createAlert({
            expeditionId,
            stationId: inv.stationId,
            type: 'INVENTORY',
            severity: isCritical ? 'CRITICAL' : 'HIGH',
            title: `Critical Supply Shortage: ${inv.station.name} ${inv.itemName}`,
            source: 'Inventory Intelligence System',
            affectedEntity: entityKey,
            reason: `Current stock of ${inv.currentStock} ${inv.unit} offers only ${Math.round(daysOfSupply)} days of supply (Safety threshold: ${inv.safetyThresholdDays} days).`,
            impact: `Station faces potential stockout in ${Math.round(daysOfSupply)} days without replenishment.`,
            recommendedAction: `Station Manager review and forward requirement to Logistics Coordinator.`,
            status: 'ACTIVE',
          });
        }
      }
    }

    // 3. Evaluate Asset Maintenance Overdue
    for (const asset of expedition.assets) {
      const remainingHours = asset.maintenanceInterval - asset.operatingHours;
      if (remainingHours <= 0) {
        const entityKey = `${asset.assetCode} (${asset.name})`;
        const alreadyExists = existingAlerts.some((a) => a.affectedEntity.includes(asset.assetCode));

        if (!alreadyExists) {
          await this.createAlert({
            expeditionId,
            stationId: asset.stationId,
            type: 'EQUIPMENT',
            severity: 'HIGH',
            title: `Maintenance Overdue: ${asset.name} (${asset.assetCode})`,
            source: 'Asset Telemetry Engine',
            affectedEntity: entityKey,
            reason: `Operating hours (${asset.operatingHours}h) exceeded scheduled maintenance interval (${asset.maintenanceInterval}h).`,
            impact: `Elevated risk of field breakdown and mechanical failure in sub-zero terrain.`,
            recommendedAction: 'Dispatch maintenance technician to station depot and swap with standby unit.',
            status: 'ACTIVE',
          });
        }
      }
    }

    return prisma.alert.findMany({
      where: { expeditionId },
      orderBy: { createdAt: 'desc' },
      include: { actions: true },
    });
  }

  public static async updateAlertStatus(alertId: string, status: string) {
    return prisma.alert.update({
      where: { id: alertId },
      data: { status },
    });
  }

  /**
   * List alerts with strict operational scoping based on user role and relationships
   */
  public static async listAlerts(expeditionId?: string, user?: any) {
    // If no user context, fallback to basic expedition filter
    if (!user) {
      const where: any = {};
      if (expeditionId) {
        const exp = await prisma.expedition.findFirst({
          where: { OR: [{ id: expeditionId }, { code: expeditionId }] },
        });
        where.expeditionId = exp ? exp.id : expeditionId;
      }
      return prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { actions: true, station: true },
      });
    }

    const scope = await ScopeService.getUserScope(user);

    // 1. ADMIN: Unrestricted global visibility
    if (scope.isAdmin) {
      const where: any = {};
      if (expeditionId) {
        const exp = await prisma.expedition.findFirst({
          where: { OR: [{ id: expeditionId }, { code: expeditionId }] },
        });
        if (exp) where.expeditionId = exp.id;
      }
      return prisma.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { actions: true, station: true },
      });
    }

    // 2. STATION MANAGER: Station alerts + linked expedition alerts + alerts directed to them
    if (scope.isStationManager) {
      const orConditions: any[] = [];
      if (scope.stationIds.length > 0) {
        orConditions.push({ stationId: { in: scope.stationIds } });
        // Also match station name in affectedEntity/source
        const stations = await prisma.station.findMany({
          where: { id: { in: scope.stationIds } },
          select: { name: true, code: true },
        });
        for (const st of stations) {
          orConditions.push({ affectedEntity: { contains: st.name } });
          orConditions.push({ affectedEntity: { contains: st.code } });
          orConditions.push({ source: { contains: st.name } });
        }
      }
      if (scope.expeditionIds.length > 0) {
        orConditions.push({ expeditionId: { in: scope.expeditionIds } });
      }
      // Recipient matches
      if (scope.userId) {
        orConditions.push({ recipientsJson: { contains: scope.userId } });
        orConditions.push({ createdBy: scope.userId });
      }

      return prisma.alert.findMany({
        where: { OR: orConditions },
        orderBy: { createdAt: 'desc' },
        include: { actions: true, station: true },
      });
    }

    // 3. EXPEDITION LEADER: Assigned expedition alerts + alerts directed to them
    if (scope.isExpeditionLeader) {
      const orConditions: any[] = [];
      if (scope.expeditionIds.length > 0) {
        orConditions.push({ expeditionId: { in: scope.expeditionIds } });
      }
      if (scope.userId) {
        orConditions.push({ recipientsJson: { contains: scope.userId } });
        orConditions.push({ createdBy: scope.userId });
      }
      return prisma.alert.findMany({
        where: { OR: orConditions },
        orderBy: { createdAt: 'desc' },
        include: { actions: true, station: true },
      });
    }

    // 4. TEAM MEMBER: Their expedition alerts + personal alerts / recipient alerts
    if (scope.isTeamMember) {
      const orConditions: any[] = [];
      if (scope.expeditionIds.length > 0) {
        orConditions.push({ expeditionId: { in: scope.expeditionIds } });
      }
      if (scope.userId) {
        orConditions.push({ recipientsJson: { contains: scope.userId } });
        orConditions.push({ createdBy: scope.userId });
      }
      if (user.assignedPersonnelId) {
        orConditions.push({ personnelId: user.assignedPersonnelId });
      }

      return prisma.alert.findMany({
        where: { OR: orConditions },
        orderBy: { createdAt: 'desc' },
        include: { actions: true, station: true },
      });
    }

    // 5. Default fallback
    return prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: { actions: true, station: true },
    });
  }

  /**
   * Create an alert and distribute notifications to automatically resolved recipients
   */
  public static async createAlert(data: CreateAlertInput, creatorUser?: any) {
    let resolvedExpId = data.expeditionId;

    if (resolvedExpId) {
      const exp = await prisma.expedition.findFirst({
        where: {
          OR: [{ id: resolvedExpId }, { code: resolvedExpId }, { title: { contains: resolvedExpId } }],
        },
      });
      if (exp) resolvedExpId = exp.id;
    }

    // Resolve stationId if passed
    let resolvedStationId = data.stationId;
    if (resolvedStationId) {
      const st = await prisma.station.findFirst({
        where: {
          OR: [
            { id: resolvedStationId },
            { code: resolvedStationId.toUpperCase() },
            { name: { contains: resolvedStationId } },
          ],
        },
      });
      if (st) {
        resolvedStationId = st.id;
        if (!resolvedExpId && st.expeditionId) resolvedExpId = st.expeditionId;
      }
    }

    if (!resolvedExpId) {
      const defaultExp = await prisma.expedition.findFirst();
      resolvedExpId = defaultExp?.id;
    }

    if (!resolvedExpId) {
      throw new Error('Unable to create alert: No active polar expedition found.');
    }

    // Determine createdBy
    const createdBy = data.createdBy || creatorUser?.id || null;

    // -------------------------------------------------------------
    // AUTOMATIC RECIPIENT RESOLUTION BASED ON RELATIONSHIPS
    // -------------------------------------------------------------
    const recipientUserIds = new Set<string>(data.recipients || []);

    // 1. All ADMIN users always receive critical / SOS / inventory alerts
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    adminUsers.forEach((a) => recipientUserIds.add(a.id));

    // 2. Resolve Station Manager for the station
    if (resolvedStationId) {
      const station = await prisma.station.findUnique({
        where: { id: resolvedStationId },
      });
      if (station?.managerId) {
        recipientUserIds.add(station.managerId);
      }
      // Also look for user with role STATION_MANAGER and stationId === resolvedStationId
      const managers = await prisma.user.findMany({
        where: {
          role: 'STATION_MANAGER',
          OR: [
            { stationId: resolvedStationId },
            { stationIdsJson: { contains: resolvedStationId } },
          ],
        },
        select: { id: true },
      });
      managers.forEach((m) => recipientUserIds.add(m.id));
    }

    // 3. Resolve Expedition Leader and Team Members
    if (resolvedExpId) {
      const expedition = await prisma.expedition.findUnique({
        where: { id: resolvedExpId },
      });
      if (expedition?.commanderId) recipientUserIds.add(expedition.commanderId);
      if (expedition?.leaderId) recipientUserIds.add(expedition.leaderId);

      // Also look for Expedition Leader users assigned to this expedition
      const leaders = await prisma.user.findMany({
        where: {
          role: { in: ['EXPEDITION_LEADER', 'COMMANDER'] },
          OR: [
            { assignedExpeditionId: resolvedExpId },
            { expeditionIdsJson: { contains: resolvedExpId } },
          ],
        },
        select: { id: true },
      });
      leaders.forEach((l) => recipientUserIds.add(l.id));

      // For SOS or Emergency, notify other expedition members
      const isEmergency =
        data.type === 'SOS' ||
        data.type === 'EMERGENCY' ||
        data.severity === 'CRITICAL' ||
        data.title.toUpperCase().includes('SOS') ||
        data.title.toUpperCase().includes('EMERGENCY');

      if (isEmergency) {
        const members = await prisma.user.findMany({
          where: {
            OR: [
              { assignedExpeditionId: resolvedExpId },
              { expeditionIdsJson: { contains: resolvedExpId } },
            ],
          },
          select: { id: true },
        });
        members.forEach((m) => recipientUserIds.add(m.id));
      }
    }

    // Always include creator
    if (createdBy) recipientUserIds.add(createdBy);

    const recipientsArray = Array.from(recipientUserIds);

    // Persist Alert
    const alert = await prisma.alert.create({
      data: {
        expeditionId: resolvedExpId,
        stationId: resolvedStationId || null,
        type: data.type || (data.title.toUpperCase().includes('SOS') ? 'SOS' : 'OPERATIONAL'),
        severity: data.severity || 'HIGH',
        title: data.title,
        message: data.message || data.reason || data.title,
        source: data.source || 'Operational Telemetry Network',
        affectedEntity: data.affectedEntity || 'Expedition Sector',
        reason: data.reason || data.message || data.title,
        impact: data.impact || 'Requires immediate command assessment',
        recommendedAction: data.recommendedAction || 'Review active operational protocol',
        status: data.status || 'ACTIVE',
        createdBy,
        personnelId: data.personnelId || null,
        recipientsJson: JSON.stringify(recipientsArray),
      },
      include: {
        station: true,
        expedition: true,
      },
    });

    // Create Notification records for each resolved recipient
    for (const recipientId of recipientsArray) {
      try {
        await prisma.notification.create({
          data: {
            userId: recipientId,
            alertId: alert.id,
            title: alert.title,
            message: alert.message || alert.reason || alert.title,
            type: alert.type,
            severity: alert.severity,
            isRead: false,
            link:
              alert.type === 'SOS' || alert.type === 'EMERGENCY'
                ? `/live-map?expedition=${alert.expeditionId}&personnel=${alert.personnelId || ''}`
                : alert.type === 'INVENTORY'
                ? `/inventory?station=${alert.stationId || ''}`
                : `/alerts`,
          },
        });
      } catch (err) {
        console.warn(`[NOTIFICATION] Could not deliver notification to ${recipientId}:`, err);
      }
    }

    return alert;
  }

  /**
   * List notifications for a specific user
   */
  public static async listNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { alert: true },
    });
  }

  /**
   * Get unread notification count for badge in navbar
   */
  public static async getUnreadNotificationCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a notification as read
   */
  public static async markNotificationAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  public static async markAllNotificationsAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

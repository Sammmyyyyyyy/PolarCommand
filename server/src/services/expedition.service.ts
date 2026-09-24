import { prisma } from '../config/database.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';
import { OrganizationService } from './organization.service.js';

export interface CreateExpeditionInput {
  code: string;
  title: string;
  type: string;
  missionObjective: string;
  commanderId?: string;
  commanderName?: string;
  organizationId?: string;
  lifecycleStatus?: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
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
  initialCrew?: Array<{
    name: string;
    role: string;
    qualification?: string;
    currentLocation?: string;
    stationIndex?: number;
    emergencyAvailability?: string;
    contactInfo?: string;
  }>;
  initialAssets?: Array<{
    name: string;
    assetCode?: string;
    type: string;
    stationIndex?: number;
    operatingHours?: number;
    maintenanceInterval?: number;
    currentCondition?: string;
  }>;
  initialCargo?: Array<{
    cargoCode?: string;
    description: string;
    category: string;
    weightKg: number;
    quantity?: number;
    priority?: string;
    origin?: string;
    destination?: string;
    transportMode?: string;
    eta?: string | Date;
    specialRequirements?: string;
  }>;
  initialTasks?: Array<{
    title: string;
    description?: string;
    priority?: string;
    location?: string;
    dueTime?: string | Date;
    assignedCrewIndex?: number;
  }>;
}

export class ExpeditionService {
  public static async listExpeditions(organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;

    return prisma.expedition.findMany({
      where,
      include: {
        commander: { select: { id: true, name: true, role: true, email: true } },
        organization: { select: { id: true, name: true, code: true } },
        stations: true,
        _count: {
          select: {
            personnel: true,
            cargo: true,
            inventory: true,
            assets: true,
            tasks: true,
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
        organization: true,
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
            tasks: true,
            incidents: true,
            alerts: true,
            movements: true,
          },
        },
      },
    });
  }

  public static async createExpedition(input: CreateExpeditionInput, user?: any) {
    const existing = await prisma.expedition.findUnique({ where: { code: input.code.toUpperCase() } });
    if (existing) {
      throw new Error(`Expedition with code ${input.code} already exists`);
    }

    let orgId = input.organizationId || user?.organizationId;
    if (!orgId) {
      const defaultOrg = await OrganizationService.getOrCreateDefaultOrganization();
      orgId = defaultOrg.id;
    }

    const lifecycle = input.lifecycleStatus || 'PLANNED';
    const status = lifecycle === 'ACTIVE' ? 'ACTIVE' : lifecycle === 'DRAFT' ? 'DRAFT' : 'PLANNING';

    const expedition = await prisma.expedition.create({
      data: {
        code: input.code.toUpperCase(),
        title: input.title,
        type: input.type,
        missionObjective: input.missionObjective,
        commanderId: input.commanderId || user?.id || null,
        commanderName: input.commanderName || user?.name || 'Commander',
        organizationId: orgId,
        status,
        lifecycleStatus: lifecycle,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        origin: input.origin,
        destination: input.destination,
        intermediateHubs: input.intermediateHubs || null,
        transportModes: input.transportModes || 'Vessel, Air, Snowcat',
        priority: input.priority || 'HIGH',
        notes: input.notes || null,
        overallRiskScore: 25,
      },
    });

    // 1. Create Initial Stations
    const createdStations: any[] = [];
    if (input.initialStations && input.initialStations.length > 0) {
      for (const st of input.initialStations) {
        const s = await prisma.station.create({
          data: {
            expeditionId: expedition.id,
            organizationId: orgId,
            name: st.name,
            code: st.code.toUpperCase(),
            region: st.region,
            latitude: st.latitude,
            longitude: st.longitude,
            capacity: st.capacity || 30,
            status: 'Operational',
            currentRisk: 20,
          },
        });
        createdStations.push(s);

        // Simulated Weather Snapshot
        await prisma.weatherSnapshot.create({
          data: {
            stationId: s.id,
            temperature: -16.5,
            windSpeedKnots: 22,
            condition: 'Clear Antarctic Skies (Simulated)',
            visibility: '15 km (Nominal)',
          },
        });

        // Seed initial station inventory items (Food, Fuel, Medical)
        await prisma.inventoryItem.createMany({
          data: [
            {
              expeditionId: expedition.id,
              stationId: s.id,
              category: 'Fuel',
              itemName: 'Arctic Polar Diesel Reserve',
              currentStock: 12000,
              unit: 'Liters',
              dailyUsage: 350,
              safetyThresholdDays: 14,
              riskStatus: 'Normal',
            },
            {
              expeditionId: expedition.id,
              stationId: s.id,
              category: 'Medicine',
              itemName: 'Trauma & Emergency Medical Packs',
              currentStock: 350,
              unit: 'Kits',
              dailyUsage: 5,
              safetyThresholdDays: 20,
              riskStatus: 'Normal',
            },
            {
              expeditionId: expedition.id,
              stationId: s.id,
              category: 'Food',
              itemName: 'Freeze-Dried Rations Buffer',
              currentStock: 1800,
              unit: 'Rations',
              dailyUsage: 45,
              safetyThresholdDays: 15,
              riskStatus: 'Normal',
            },
          ],
        });
      }
    }

    // 2. Create Initial Crew / Personnel
    const createdPersonnel: any[] = [];
    if (input.initialCrew && input.initialCrew.length > 0) {
      let crewIdx = 1;
      for (const c of input.initialCrew) {
        const station = createdStations[c.stationIndex || 0] || createdStations[0] || null;
        const p = await prisma.personnel.create({
          data: {
            expeditionId: expedition.id,
            memberId: `PER-${String(crewIdx).padStart(3, '0')}`,
            name: c.name,
            role: c.role || 'Specialist',
            qualification: c.qualification || 'Polar Operations Certified',
            currentLocation: c.currentLocation || station?.name || 'Base Staging',
            assignedStationId: station?.id || null,
            emergencyAvailability: c.emergencyAvailability || 'Available',
            status: 'At Station',
            checkInStatus: 'ACTIVE',
            lastCheckIn: new Date(),
            expectedNextCheckIn: new Date(Date.now() + 12 * 3600 * 1000),
            contactInfo: c.contactInfo || 'VHF Ch-16 / Iridium 8816',
          },
        });
        createdPersonnel.push(p);
        crewIdx++;
      }
    }

    // 3. Create Initial Assets
    if (input.initialAssets && input.initialAssets.length > 0) {
      let assetIdx = 1;
      for (const a of input.initialAssets) {
        const station = createdStations[a.stationIndex || 0] || createdStations[0];
        if (station) {
          await prisma.asset.create({
            data: {
              expeditionId: expedition.id,
              organizationId: orgId,
              assetCode: a.assetCode || `AST-${String(assetIdx).padStart(2, '0')}`,
              name: a.name,
              type: a.type || 'Snow Vehicle',
              stationId: station.id,
              currentCondition: a.currentCondition || 'Good',
              operatingHours: a.operatingHours || 120,
              maintenanceInterval: a.maintenanceInterval || 2000,
              lastMaintenanceDate: new Date(),
              healthPercentage: 100,
              failureRisk: 'Low',
              status: 'Operational',
              lifecycleStatus: 'AVAILABLE',
            },
          });
          assetIdx++;
        }
      }
    }

    // 4. Create Initial Cargo
    if (input.initialCargo && input.initialCargo.length > 0) {
      let cargoIdx = 1;
      for (const cg of input.initialCargo) {
        await prisma.cargo.create({
          data: {
            expeditionId: expedition.id,
            cargoCode: cg.cargoCode || `CRG-${String(cargoIdx).padStart(3, '0')}`,
            description: cg.description,
            category: cg.category || 'General',
            weightKg: Number(cg.weightKg) || 500,
            quantity: Number(cg.quantity) || 1,
            origin: cg.origin || input.origin,
            destination: cg.destination || (createdStations[0]?.name || input.destination),
            currentLocation: cg.origin || input.origin,
            transportMode: cg.transportMode || 'Vessel',
            priority: cg.priority || 'MEDIUM',
            departureDate: new Date(),
            eta: cg.eta ? new Date(cg.eta) : new Date(Date.now() + 86400000 * 10),
            originalEta: cg.eta ? new Date(cg.eta) : new Date(Date.now() + 86400000 * 10),
            delayHours: 0,
            status: 'PLANNED',
            specialRequirements: cg.specialRequirements || null,
          },
        });
        cargoIdx++;
      }
    }

    // 5. Create Initial Operational Tasks
    if (input.initialTasks && input.initialTasks.length > 0) {
      for (const t of input.initialTasks) {
        const assignedPerson = createdPersonnel[t.assignedCrewIndex || 0] || null;
        await prisma.task.create({
          data: {
            expeditionId: expedition.id,
            title: t.title,
            description: t.description || '',
            priority: t.priority || 'MEDIUM',
            status: assignedPerson ? 'ASSIGNED' : 'PENDING',
            location: t.location || createdStations[0]?.name || 'Field Sector',
            assignedPersonnelId: assignedPerson?.id || null,
            startTime: new Date(),
            dueTime: t.dueTime ? new Date(t.dueTime) : new Date(Date.now() + 86400000 * 3),
          },
        });
      }
    }

    // Seed baseline risk snapshot
    await RiskService.calculateAndRecordExpeditionRisk(expedition.id);
    await AlertService.evaluateAndSyncAlerts(expedition.id);

    await AuditService.record({
      expeditionId: expedition.id,
      userId: user?.id,
      userName: user?.name || 'Mission Controller',
      userRole: user?.role || 'ADMIN',
      action: 'COMMISSION_EXPEDITION',
      entity: 'Expedition',
      entityId: expedition.id,
      reason: `Commissioned expedition ${expedition.code} (${expedition.title}) [Lifecycle: ${lifecycle}] with ${createdStations.length} stations and ${createdPersonnel.length} personnel.`,
    });

    return this.getExpedition(expedition.id);
  }

  public static async publishExpedition(id: string, user?: any) {
    const exp = await prisma.expedition.findUnique({
      where: { id },
      include: { stations: true, personnel: true },
    });
    if (!exp) throw new Error(`Expedition ${id} not found`);

    if (exp.stations.length === 0) {
      throw new Error('Expedition must have at least one station assigned before publishing');
    }

    const updated = await prisma.expedition.update({
      where: { id },
      data: {
        lifecycleStatus: 'ACTIVE',
        status: 'ACTIVE',
      },
    });

    await RiskService.calculateAndRecordExpeditionRisk(id);
    await AlertService.evaluateAndSyncAlerts(id);

    await AuditService.record({
      expeditionId: id,
      userId: user?.id,
      userName: user?.name || 'Mission Commander',
      userRole: user?.role || 'COMMANDER',
      action: 'PUBLISH_EXPEDITION',
      entity: 'Expedition',
      entityId: id,
      previousState: exp.lifecycleStatus,
      newState: 'ACTIVE',
      reason: `Expedition ${exp.code} explicitly published and transitioned to operational ACTIVE lifecycle.`,
    });

    return updated;
  }

  public static async updateLifecycle(
    id: string,
    lifecycleStatus: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED',
    user?: any
  ) {
    const prev = await prisma.expedition.findUnique({ where: { id } });
    if (!prev) throw new Error(`Expedition ${id} not found`);

    const statusMap: Record<string, string> = {
      DRAFT: 'DRAFT',
      PLANNED: 'PLANNING',
      ACTIVE: 'ACTIVE',
      PAUSED: 'PAUSED',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      ARCHIVED: 'ARCHIVED',
    };

    const updated = await prisma.expedition.update({
      where: { id },
      data: {
        lifecycleStatus,
        status: statusMap[lifecycleStatus] || 'ACTIVE',
      },
    });

    await AuditService.record({
      expeditionId: id,
      userId: user?.id,
      userName: user?.name || 'Mission Commander',
      userRole: user?.role || 'COMMANDER',
      action: 'UPDATE_LIFECYCLE_STATUS',
      entity: 'Expedition',
      entityId: id,
      previousState: prev.lifecycleStatus,
      newState: lifecycleStatus,
      reason: `Expedition lifecycle status shifted to ${lifecycleStatus}`,
    });

    return updated;
  }

  public static async updateExpedition(id: string, data: Partial<CreateExpeditionInput>, user?: any) {
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    delete updateData.initialStations;
    delete updateData.initialCrew;
    delete updateData.initialAssets;
    delete updateData.initialCargo;
    delete updateData.initialTasks;

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
        organization: true,
        stations: {
          include: {
            weather: { orderBy: { recordedAt: 'desc' }, take: 1 },
          },
        },
        cargo: true,
        inventory: { include: { station: true } },
        assets: { include: { station: true } },
        personnel: true,
        tasks: { include: { assignedPersonnel: true } },
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
    const overdueCheckIns = expedition.personnel.filter((p) => p.isCheckInOverdue).length;

    // Tasks summary
    const totalTasks = expedition.tasks.length;
    const pendingTasks = expedition.tasks.filter((t) => t.status === 'PENDING').length;
    const activeTasks = expedition.tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
    const blockedTasks = expedition.tasks.filter((t) => t.status === 'BLOCKED').length;
    const completedTasks = expedition.tasks.filter((t) => t.status === 'COMPLETED').length;

    const totalCargo = expedition.cargo.length;
    const delayedCargo = expedition.cargo.filter((c) => c.status === 'DELAYED' || c.status === 'Delayed' || c.delayHours > 0).length;
    const inTransitCargo = expedition.cargo.filter((c) => c.status === 'IN_TRANSIT' || c.status === 'In Transit').length;
    const deliveredCargo = expedition.cargo.filter((c) => c.status === 'DELIVERED' || c.status === 'Arrived').length;

    const totalAssets = expedition.assets.length;
    const operationalAssets = expedition.assets.filter((a) => a.status === 'Operational' || a.lifecycleStatus === 'AVAILABLE' || a.lifecycleStatus === 'IN_USE').length;
    const maintenanceDueAssets = expedition.assets.filter(
      (a) => a.maintenanceInterval - a.operatingHours <= 0 || a.lifecycleStatus === 'MAINTENANCE_DUE' || a.status === 'Maintenance'
    ).length;
    const failedAssets = expedition.assets.filter((a) => a.lifecycleStatus === 'FAILED' || a.status === 'Critical').length;

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
        overdueCheckIns,
        cargoShipments: totalCargo,
        delayedCargoCount: delayedCargo,
        inTransitCargoCount: inTransitCargo,
        deliveredCargoCount: deliveredCargo,
        assets: totalAssets,
        operationalAssetsCount: operationalAssets,
        maintenanceDueAssetsCount: maintenanceDueAssets,
        failedAssetsCount: failedAssets,
        inventoryReadiness,
        inventoryItemsAtRisk: inventoryAtRisk,
        activeAlerts,
        overallRisk: risk.totalScore,
        riskLevel: risk.riskLevel,
        riskBreakdown: risk.breakdown,
        contributingFactors: risk.contributingFactors,
        recommendedMitigation: risk.recommendedMitigation,
        tasks: {
          total: totalTasks,
          pending: pendingTasks,
          active: activeTasks,
          blocked: blockedTasks,
          completed: completedTasks,
        },
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

  /**
   * Section 4: Operational Readiness Evaluation before Publishing.
   * Evaluates Command, Personnel, Stations, Assets, Cargo, Inventory, Tasks, Emergency, and Communication.
   */
  public static async evaluateReadiness(expeditionId: string) {
    const exp = await prisma.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        commander: true,
        stations: true,
        personnel: true,
        assets: true,
        cargo: true,
        inventory: true,
        tasks: true,
      },
    });

    if (!exp) throw new Error(`Expedition ${expeditionId} not found`);

    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    // 1. COMMAND
    const hasCommander = !!(exp.commanderId || exp.commanderName);
    if (!hasCommander) {
      blockingIssues.push('No Expedition Commander assigned.');
    }

    // 2. PERSONNEL
    if (exp.personnel.length === 0) {
      blockingIssues.push('No personnel assigned to expedition crew roster.');
    } else if (exp.personnel.length < 2) {
      blockingIssues.push(`Minimum crew requirement not met (assigned: ${exp.personnel.length}, required >= 2).`);
    } else if (exp.personnel.length < 4) {
      warnings.push(`Crew size (${exp.personnel.length}) is below recommended expedition baseline of 4.`);
    }

    const hasDoctor = exp.personnel.some(
      (p) =>
        p.role.toLowerCase().includes('doctor') ||
        p.role.toLowerCase().includes('medic') ||
        p.qualification.toLowerCase().includes('medical') ||
        p.qualification.toLowerCase().includes('surgeon')
    );
    if (!hasDoctor && exp.personnel.length >= 2) {
      warnings.push('No certified medical responder or doctor assigned to crew roster.');
    }

    // 3. STATIONS
    if (exp.stations.length === 0) {
      blockingIssues.push('No operational stations or forward operating bases configured.');
    }

    // 4. ASSETS
    if (exp.assets.length === 0) {
      blockingIssues.push('No operational vehicles or machinery assets assigned.');
    }
    const failedAssets = exp.assets.filter(
      (a) => a.lifecycleStatus === 'FAILED' || a.status === 'Critical' || a.status === 'Unavailable'
    );
    if (failedAssets.length > 0) {
      blockingIssues.push(`Critical assets unavailable or failed: ${failedAssets.map((a) => a.assetCode).join(', ')}`);
    }
    const maintenanceDue = exp.assets.filter(
      (a) => a.lifecycleStatus === 'MAINTENANCE_DUE' || a.maintenanceInterval - a.operatingHours <= 0
    );
    if (maintenanceDue.length > 0) {
      warnings.push(`Assets overdue for maintenance overhaul: ${maintenanceDue.map((a) => a.assetCode).join(', ')}`);
    }

    // 5. CARGO
    if (exp.cargo.length === 0) {
      warnings.push('No cargo or supply shipments planned for this expedition.');
    }
    const hasFuelOrFood = exp.cargo.some(
      (c) =>
        c.category.toLowerCase().includes('fuel') ||
        c.category.toLowerCase().includes('food') ||
        c.category.toLowerCase().includes('ration')
    );
    if (exp.cargo.length > 0 && !hasFuelOrFood) {
      warnings.push('No life-support fuel or ration shipments identified in cargo manifest.');
    }

    // 6. INVENTORY
    if (exp.inventory.length === 0) {
      warnings.push('Station baseline inventory has not been configured.');
    } else {
      const stockBreaches = exp.inventory.filter((i) => {
        const days = i.dailyUsage > 0 ? i.currentStock / i.dailyUsage : 999;
        return days <= i.safetyThresholdDays;
      });
      if (stockBreaches.length > 0) {
        warnings.push(`${stockBreaches.length} inventory items currently below safety reserve threshold.`);
      }
    }

    // 7. TASKS
    if (exp.tasks.length === 0) {
      warnings.push('No initial operational tasks configured for deployment.');
    }

    // 8. EMERGENCY & COMMUNICATION
    const commMethodConfigured = !!(
      exp.notes?.toLowerCase().includes('iridium') ||
      exp.notes?.toLowerCase().includes('vhf') ||
      exp.notes?.toLowerCase().includes('starlink') ||
      exp.connectivityStatus
    );
    if (!commMethodConfigured) {
      warnings.push('Expedition communication protocols (Iridium / VHF / Starlink) not explicitly verified.');
    }

    const isReady = blockingIssues.length === 0;
    const scoreDeductions = blockingIssues.length * 25 + warnings.length * 8;
    const overallScore = Math.max(0, 100 - scoreDeductions);

    return {
      isReady,
      status: isReady ? 'READY' : 'NOT READY',
      overallScore,
      score: overallScore,
      blockingIssues,
      warnings,
      details: {
        command: { passed: hasCommander, message: hasCommander ? 'Commander designated' : 'No Commander assigned' },
        personnel: {
          passed: exp.personnel.length >= 2,
          message: `${exp.personnel.length} crew assigned`,
          crewCount: exp.personnel.length,
          hasDoctor,
        },
        stations: {
          passed: exp.stations.length >= 1,
          message: `${exp.stations.length} stations configured`,
          stationCount: exp.stations.length,
        },
        assets: {
          passed: exp.assets.length >= 1 && failedAssets.length === 0,
          message: `${exp.assets.length} assets assigned (${failedAssets.length} failed)`,
          assetCount: exp.assets.length,
        },
        cargo: { passed: exp.cargo.length > 0, message: `${exp.cargo.length} cargo shipments`, cargoCount: exp.cargo.length },
        inventory: { passed: exp.inventory.length > 0, message: `${exp.inventory.length} inventory items`, itemCount: exp.inventory.length },
        tasks: { passed: exp.tasks.length > 0, message: `${exp.tasks.length} tasks scheduled`, taskCount: exp.tasks.length },
        emergency: { passed: true, message: 'Emergency response protocol configured' },
      },
    };
  }

  /**
   * Check organization-wide resource allocation and detect overlapping expedition commitments.
   */
  public static async checkResourceAvailability(
    expeditionIdOrOrgId?: string,
    orgId?: string,
    _startDate?: Date,
    _endDate?: Date
  ) {
    const targetOrgId = orgId || expeditionIdOrOrgId;
    const where: any = {};
    if (targetOrgId) where.organizationId = targetOrgId;

    const allExpeditions = await prisma.expedition.findMany({
      where: {
        ...where,
        lifecycleStatus: { in: ['PLANNED', 'ACTIVE'] },
      },
      include: {
        personnel: true,
        assets: true,
      },
    });

    const activeExpeditions = allExpeditions.filter((e) => e.lifecycleStatus === 'ACTIVE');
    const plannedExpeditions = allExpeditions.filter((e) => e.lifecycleStatus === 'PLANNED');

    const committedPersonnel = new Map<string, { id: string; name: string; expeditionCode: string }>();
    const committedAssets = new Map<string, { id: string; name: string; expeditionCode: string }>();

    for (const exp of allExpeditions) {
      for (const p of exp.personnel) {
        committedPersonnel.set(p.name, { id: p.id, name: p.name, expeditionCode: exp.code });
      }
      for (const a of exp.assets) {
        committedAssets.set(a.name, { id: a.id, name: a.name, expeditionCode: exp.code });
      }
    }

    const personnelArray = Array.from(committedPersonnel.values()).map((p) => ({
      id: p.id,
      name: p.name,
      expeditionCode: p.expeditionCode,
      isCommitted: true,
    }));

    const assetsArray = Array.from(committedAssets.values()).map((a) => ({
      id: a.id,
      name: a.name,
      expeditionCode: a.expeditionCode,
      isCommitted: true,
    }));

    return {
      activeExpeditionsCount: activeExpeditions.length,
      plannedExpeditionsCount: plannedExpeditions.length,
      committedPersonnelCount: committedPersonnel.size,
      committedAssetsCount: committedAssets.size,
      personnel: personnelArray,
      assets: assetsArray,
      committedPersonnel: personnelArray,
      committedAssets: assetsArray,
    };
  }
}

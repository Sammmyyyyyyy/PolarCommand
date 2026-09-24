import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { WeatherConditionReport } from './weather/weather.types.js';

export class MovementService {
  public static async listMovements(expeditionId: string, status?: string) {
    const where: any = { expeditionId };
    if (status && status !== 'All') where.status = status;

    return prisma.movement.findMany({
      where,
      include: {
        assignedAsset: true,
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

  public static async getMovement(id: string) {
    return prisma.movement.findUnique({
      where: { id },
      include: {
        assignedAsset: true,
        personnelRoster: { include: { personnel: true } },
        cargoManifest: { include: { cargo: true } },
      },
    });
  }

  public static async createMovement(expeditionId: string, data: any, user?: any) {
    // Generate movement code
    const count = await prisma.movement.count({ where: { expeditionId } });
    const code = data.movementCode || `MVT-${(count + 1).toString().padStart(3, '0')}`;

    const plannedDep = new Date(data.plannedDeparture || data.departureTime || Date.now());
    const plannedArrival = new Date(data.plannedEta || data.eta || Date.now() + 86400000 * 2);

    const fromLoc = data.fromLocation || data.originStation || 'Base Station';
    const toLoc = data.toLocation || data.destStation || 'Forward Station';

    const movement = await prisma.movement.create({
      data: {
        expeditionId,
        movementCode: code,
        fromLocation: fromLoc,
        toLocation: toLoc,
        route: data.route || `${fromLoc} -> ${toLoc} Traverse Corridor`,
        departureTime: plannedDep,
        eta: plannedArrival,
        plannedDeparture: plannedDep,
        plannedEta: plannedArrival,
        transportMode: data.transportMode || 'Snowcat Convoy',
        status: data.status || 'PLANNED',
        assignedAssetId: data.assignedAssetId || null,
        currentLat: data.currentLat ? Number(data.currentLat) : null,
        currentLng: data.currentLng ? Number(data.currentLng) : null,
        currentLocation: data.currentLocation || data.fromLocation,
        delayHours: Number(data.delayHours || 0),
        weatherConstraint: data.weatherConstraint || null,
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
        }).catch(() => {});
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
        }).catch(() => {});
      }
    }

    await AuditService.record({
      expeditionId,
      userId: user?.id,
      userName: user?.name || 'System Operator',
      userRole: user?.role || 'COMMANDER',
      action: 'CREATE_MOVEMENT',
      entity: 'Movement',
      entityId: movement.id,
      reason: `Logged transit movement ${code} from ${movement.fromLocation} to ${movement.toLocation} (${movement.transportMode})`,
    });

    return this.getMovement(movement.id);
  }

  public static async updateMovementStatus(
    id: string,
    status: string,
    options?: { delayHours?: number; notes?: string; actualArrival?: Date; weatherConstraint?: string },
    user?: any
  ) {
    const prev = await prisma.movement.findUnique({
      where: { id },
      include: { cargoManifest: { include: { cargo: true } } },
    });
    if (!prev) throw new Error(`Movement ${id} not found`);

    const updateData: any = { status };
    if (status === 'ARRIVED') {
      updateData.actualArrival = options?.actualArrival || new Date();
    }
    if (status === 'IN_TRANSIT' && !prev.actualDeparture) {
      updateData.actualDeparture = new Date();
    }
    if (options?.notes) {
      updateData.notes = options.notes;
    }
    if (options?.weatherConstraint !== undefined) {
      updateData.weatherConstraint = options.weatherConstraint;
    }

    const additionalDelay = Number(options?.delayHours || 0);
    if (additionalDelay > 0) {
      updateData.delayHours = { increment: additionalDelay };
      const currentEtaTime = new Date(prev.eta).getTime();
      updateData.eta = new Date(currentEtaTime + additionalDelay * 3600000);
      updateData.status = 'DELAYED';
    }

    const updated = await prisma.movement.update({
      where: { id },
      data: updateData,
    });

    // Propagate delay downstream to associated cargo and inventory items
    if (additionalDelay > 0 && prev.cargoManifest.length > 0) {
      for (const manifestItem of prev.cargoManifest) {
        const cargo = manifestItem.cargo;
        const newCargoEta = new Date(new Date(cargo.eta).getTime() + additionalDelay * 3600000);
        await prisma.cargo.update({
          where: { id: cargo.id },
          data: {
            delayHours: { increment: additionalDelay },
            eta: newCargoEta,
            status: 'Delayed',
          },
        });

        // Update any inventory items linked to this cargo
        await prisma.inventoryItem.updateMany({
          where: { linkedCargoId: cargo.id },
          data: { replenishmentEta: newCargoEta, riskStatus: 'Warning' },
        });
      }

      // Re-evaluate risk and alerts across the expedition
      await RiskService.calculateAndRecordExpeditionRisk(prev.expeditionId);
      await AlertService.evaluateAndSyncAlerts(prev.expeditionId);

      console.log(`[DOMAIN EVENT: MovementDelayed] {"expeditionId":"${prev.expeditionId}","movementId":"${id}","delayHours":${additionalDelay},"cargoCount":${prev.cargoManifest.length}}`);
    }

    await AuditService.record({
      expeditionId: prev.expeditionId,
      userId: user?.id,
      userName: user?.name || 'System Operator',
      userRole: user?.role || 'COMMANDER',
      action: 'UPDATE_MOVEMENT_STATUS',
      entity: 'Movement',
      entityId: id,
      previousState: prev.status,
      newState: updated.status,
      reason: options?.notes || `Movement status updated to ${updated.status}${additionalDelay > 0 ? ` (+${additionalDelay}h delay propagated)` : ''}`,
    });

    return this.getMovement(id);
  }

  /**
   * Deterministic weather constraint application for movements.
   * If weather conditions degrade to RESTRICTED or PROHIBITED, automatically applies delays and propagates.
   */
  public static async applyWeatherConstraint(movementId: string, weather: WeatherConditionReport, user?: any) {
    const movement = await prisma.movement.findUnique({ where: { id: movementId } });
    if (!movement) throw new Error(`Movement ${movementId} not found`);

    let delayHours = 0;
    let newStatus = movement.status;

    if (weather.travelFeasibility === 'PROHIBITED') {
      delayHours = 6;
      newStatus = 'DELAYED';
    } else if (weather.travelFeasibility === 'RESTRICTED') {
      delayHours = 3;
      newStatus = 'DELAYED';
    } else if (weather.travelFeasibility === 'CAUTION') {
      delayHours = 1;
    }

    const constraintNote = `Weather constraint: ${weather.condition}, winds ${weather.windSpeedKnots} kn (gusts ${weather.windGustKnots} kn). Feasibility: ${weather.travelFeasibility}. ${weather.advisoryNote}`;

    return this.updateMovementStatus(
      movementId,
      newStatus,
      {
        delayHours,
        weatherConstraint: constraintNote,
        notes: `Automated weather constraint: ${weather.travelFeasibility} (${weather.condition})`,
      },
      user
    );
  }
}

import { prisma } from '../config/database.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';
import { eventBus } from '../events/eventBus.js';

export class CargoService {
  public static async listCargo(expeditionId: string, filter?: { category?: string; status?: string }) {
    const where: any = { expeditionId };
    if (filter?.category && filter.category !== 'All') where.category = filter.category;
    if (filter?.status && filter.status !== 'All') where.status = filter.status;

    return prisma.cargo.findMany({
      where,
      include: {
        linkedInventory: { include: { station: true } },
      },
      orderBy: { departureDate: 'asc' },
    });
  }

  public static async getCargoItem(id: string) {
    return prisma.cargo.findUnique({
      where: { id },
      include: {
        expedition: true,
        linkedInventory: { include: { station: true } },
        movements: { include: { movement: true } },
      },
    });
  }

  public static async createCargo(expeditionId: string, data: any, user?: any) {
    const cargo = await prisma.cargo.create({
      data: {
        expeditionId,
        cargoCode: data.cargoCode || `CRG-${Date.now().toString().slice(-4)}`,
        description: data.description,
        category: data.category,
        weightKg: Number(data.weightKg) || 100,
        quantity: Number(data.quantity) || 1,
        origin: data.origin || 'Main Logistics Base',
        destination: data.destination,
        currentLocation: data.currentLocation || data.origin || 'Main Logistics Base',
        transportMode: data.transportMode || 'Vessel',
        priority: data.priority || 'MEDIUM',
        departureDate: new Date(data.departureDate || Date.now()),
        eta: new Date(data.eta || Date.now() + 86400000 * 14),
        originalEta: new Date(data.eta || Date.now() + 86400000 * 14),
        delayHours: 0,
        specialRequirements: data.specialRequirements || null,
        status: data.status || 'PLANNED',
        vesselName: data.vesselName || null,
        journeyJson: JSON.stringify([
          { stage: 'Logistics Staging', location: data.origin, status: 'completed' },
          { stage: 'Transit Corridor', location: 'Maritime Transit', status: 'current' },
          { stage: 'Station Delivery', location: data.destination, status: 'upcoming' },
        ]),
      },
    });

    await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
    await AlertService.evaluateAndSyncAlerts(expeditionId);

    await AuditService.record({
      expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'CREATE_CARGO',
      entity: 'Cargo',
      entityId: cargo.id,
      reason: `Logged new cargo consignment ${cargo.cargoCode} (${cargo.description})`,
    });

    return cargo;
  }

  public static async updateCargo(id: string, data: any, user?: any) {
    const prev = await prisma.cargo.findUnique({ where: { id } });
    if (!prev) throw new Error(`Cargo ${id} not found`);

    const updateData: any = { ...data };
    if (data.departureDate) updateData.departureDate = new Date(data.departureDate);
    if (data.eta) updateData.eta = new Date(data.eta);
    if (data.weightKg) updateData.weightKg = Number(data.weightKg);

    // If logistics officer is increasing delay hours or changing status to Delayed
    const isNewDelay = (data.delayHours && data.delayHours > prev.delayHours) || (data.status === 'DELAYED' && prev.status !== 'DELAYED');
    if (isNewDelay) {
      const addedDelay = (data.delayHours || 24) - prev.delayHours;
      return this.applyOperationalCargoDelay(id, addedDelay > 0 ? addedDelay : 24, user);
    }

    const updated = await prisma.cargo.update({
      where: { id },
      data: updateData,
    });

    await RiskService.calculateAndRecordExpeditionRisk(prev.expeditionId);
    await AlertService.evaluateAndSyncAlerts(prev.expeditionId);

    await AuditService.record({
      expeditionId: prev.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'UPDATE_CARGO',
      entity: 'Cargo',
      entityId: id,
      previousState: prev.status,
      newState: updated.status,
      reason: `Updated cargo status/parameters for ${updated.cargoCode}`,
    });

    return updated;
  }

  public static async deleteCargo(id: string, user?: any) {
    const item = await prisma.cargo.findUnique({ where: { id } });
    if (!item) throw new Error(`Cargo ${id} not found`);

    const deleted = await prisma.cargo.delete({ where: { id } });
    await RiskService.calculateAndRecordExpeditionRisk(item.expeditionId);
    await AlertService.evaluateAndSyncAlerts(item.expeditionId);

    await AuditService.record({
      expeditionId: item.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DELETE_CARGO',
      entity: 'Cargo',
      entityId: id,
      reason: `Removed cargo manifest item ${deleted.cargoCode}`,
    });

    return deleted;
  }

  /**
   * Station personnel receives cargo at destination base
   */
  public static async receiveCargo(
    id: string,
    payload: {
      receivedQuantity?: number;
      conditionOnArrival?: string;
      receivingNotes?: string;
    },
    user?: any
  ) {
    const cargo = await prisma.cargo.findUnique({
      where: { id },
      include: { expedition: true },
    });
    if (!cargo) throw new Error(`Cargo ${id} not found`);

    const receivedQty = payload.receivedQuantity !== undefined ? Number(payload.receivedQuantity) : cargo.quantity;
    const condition = payload.conditionOnArrival || 'Intact';
    const finalStatus = condition.toLowerCase().includes('compromised') || condition.toLowerCase().includes('damage') ? 'DAMAGED' : 'DELIVERED';
    const now = new Date();

    const updated = await prisma.cargo.update({
      where: { id },
      data: {
        status: finalStatus,
        receivedAt: now,
        receivedBy: user?.name || 'Station Receiving Officer',
        receivedQuantity: receivedQty,
        conditionOnArrival: condition,
        receivingNotes: payload.receivingNotes || null,
        currentLocation: cargo.destination,
      },
    });

    // Replenish inventory at destination station
    const catPrefix = cargo.category.slice(0, 3).toLowerCase();
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        expeditionId: cargo.expeditionId,
        OR: [
          { linkedCargoId: cargo.id },
          { category: { contains: catPrefix } },
        ],
      },
      include: { station: true },
    });

    let inventoryUpdated = null;
    if (inventoryItem) {
      const newStock = inventoryItem.currentStock + receivedQty;
      const daily = inventoryItem.dailyUsage > 0 ? inventoryItem.dailyUsage : 1;
      const newCoverage = newStock / daily;
      const riskStatus = newCoverage > inventoryItem.safetyThresholdDays ? 'Normal' : 'Warning';

      inventoryUpdated = await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          currentStock: newStock,
          riskStatus,
          replenishmentEta: null,
        },
      });
    }

    await RiskService.calculateAndRecordExpeditionRisk(cargo.expeditionId);
    await AlertService.evaluateAndSyncAlerts(cargo.expeditionId);

    await AuditService.record({
      expeditionId: cargo.expeditionId,
      userId: user?.id,
      userName: user?.name || 'Station Logistics Officer',
      userRole: user?.role || 'LOGISTICS_OFFICER',
      action: 'RECEIVE_CARGO',
      entity: 'Cargo',
      entityId: id,
      previousState: cargo.status,
      newState: finalStatus,
      reason: `Received consignment ${cargo.cargoCode} at ${cargo.destination}: ${receivedQty} units (${condition}). Stock replenished to ${inventoryUpdated?.currentStock || 'N/A'}.`,
    });

    return { cargo: updated, inventory: inventoryUpdated };
  }

  /**
   * Real operational delay or simulation delay applied to live state
   */
  public static async applyOperationalCargoDelay(cargoId: string, delayHours: number, user?: any) {
    const cargo = await prisma.cargo.findUnique({
      where: { id: cargoId },
      include: { expedition: true },
    });

    if (!cargo) throw new Error(`Cargo ${cargoId} not found`);

    const expeditionId = cargo.expeditionId;
    const previousRisk = cargo.expedition.overallRiskScore;

    // Apply delay in database
    const newEta = new Date(cargo.eta.getTime() + delayHours * 3600000);
    const updated = await prisma.cargo.update({
      where: { id: cargoId },
      data: {
        delayHours: cargo.delayHours + delayHours,
        eta: newEta,
        status: 'Delayed',
      },
    });

    // Check destination inventory buffer impact
    const catPrefix = cargo.category.slice(0, 3).toLowerCase();
    const destinationInventory = await prisma.inventoryItem.findFirst({
      where: {
        expeditionId,
        OR: [
          { linkedCargoId: cargo.id },
          { category: { contains: catPrefix } },
        ],
      },
      include: { station: true },
    });

    let prevDays = 14;
    let newDays = 7;
    let affectedStationName = cargo.destination;

    if (destinationInventory) {
      affectedStationName = destinationInventory.station.name;
      const daily = destinationInventory.dailyUsage > 0 ? destinationInventory.dailyUsage : 1;
      prevDays = Math.round(destinationInventory.currentStock / daily);
      const daysDrop = Math.max(1, Math.round(delayHours / 24));
      const burnConsumption = daysDrop * daily;
      const newStock = Math.max(15, destinationInventory.currentStock - burnConsumption);

      await prisma.inventoryItem.update({
        where: { id: destinationInventory.id },
        data: { currentStock: newStock, riskStatus: 'High Risk' },
      });
      newDays = Math.round(newStock / daily);
    }

    // Recalculate Risk & Alerts
    const newRisk = await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
    const alerts = await AlertService.evaluateAndSyncAlerts(expeditionId);

    // Emit Domain Event
    eventBus.emitDomainEvent('CargoDelayed', {
      expeditionId,
      cargoId: cargo.id,
      cargoCode: cargo.cargoCode,
      delayHours,
      newRisk: newRisk.totalScore,
    });

    await AuditService.record({
      expeditionId,
      userId: user?.id,
      userName: user?.name || 'Logistics Officer',
      userRole: user?.role || 'LOGISTICS_OFFICER',
      action: 'DELAY_CARGO',
      entity: 'Cargo',
      entityId: cargo.id,
      previousState: cargo.delayHours,
      newState: updated.delayHours,
      reason: `Recorded operational transit delay of +${delayHours}h for ${cargo.cargoCode} (${cargo.description})`,
    });

    const recommendation = `${destinationInventory?.category || 'Fuel/Medical'} reserve at ${affectedStationName} is projected to fall below the configured safety threshold (${destinationInventory?.safetyThresholdDays || 12} days) to ${newDays} days because Cargo ${cargo.cargoCode} is delayed by ${delayHours} hours. Reallocate reserve from neighboring station.`;

    return {
      cargo: updated,
      impact: {
        stationAffected: affectedStationName,
        inventoryCategoryAffected: cargo.category,
        previousDaysRemaining: prevDays,
        newDaysRemaining: newDays,
        previousOverallRisk: previousRisk,
        newOverallRisk: newRisk.totalScore,
        riskLevel: newRisk.riskLevel,
        recommendedAction: recommendation,
        impactChain: [
          {
            step: 1,
            title: 'Cargo Delay Recorded',
            description: `Shipment ${cargo.cargoCode} delayed by +${delayHours}h in maritime corridor.`,
            status: 'trigger',
          },
          {
            step: 2,
            title: 'Arrival Schedule Slip',
            description: `Antarctic delivery pushed to ${newEta.toISOString().slice(0, 10)}.`,
            status: 'cascade',
          },
          {
            step: 3,
            title: 'Inventory Buffer Breach',
            description: `${affectedStationName} reserve coverage dropped from ${prevDays} to ${newDays} days (safety threshold breached).`,
            status: 'breach',
          },
          {
            step: 4,
            title: 'Expedition Risk Surge',
            description: `Operational risk surged from ${previousRisk} to ${newRisk.totalScore} / 100.`,
            status: 'cascade',
          },
          {
            step: 5,
            title: 'Alert Dispatched',
            description: 'CRITICAL operational alert dispatched to Expedition Commander.',
            status: 'alert',
          },
          {
            step: 6,
            title: 'Mitigation Formulated',
            description: recommendation,
            status: 'recommendation',
          },
        ],
      },
      alerts,
    };
  }

  public static async simulateCargoDelay(cargoId: string, delayHours: number, user?: any) {
    return this.applyOperationalCargoDelay(cargoId, delayHours, user);
  }
}

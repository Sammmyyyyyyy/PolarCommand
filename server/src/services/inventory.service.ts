import { prisma } from '../config/database.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';

export class InventoryService {
  /**
   * Helper to derive inventory health status and recommended restock
   */
  public static deriveStatus(currentStock: number, minThreshold: number) {
    const threshold = minThreshold > 0 ? minThreshold : 100;
    let status: 'NORMAL' | 'LOW' | 'CRITICAL' = 'NORMAL';
    let riskStatus = 'Normal';

    if (currentStock <= threshold * 0.5) {
      status = 'CRITICAL';
      riskStatus = 'Critical';
    } else if (currentStock <= threshold) {
      status = 'LOW';
      riskStatus = 'Warning';
    }

    const recommendedRestock = Math.max(
      Math.ceil(threshold * 2 - currentStock),
      threshold
    );

    return {
      status,
      riskStatus,
      needsRestock: status !== 'NORMAL',
      recommendedRestock,
    };
  }

  public static async listInventory(expeditionId?: string, stationId?: string, category?: string) {
    const where: any = {};
    if (expeditionId) where.expeditionId = expeditionId;
    if (stationId && stationId !== 'all') where.stationId = stationId;
    if (category && category !== 'All') where.category = category;

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        station: true,
        linkedCargo: true,
        restockRequests: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { itemName: 'asc' },
    });

    return items.map((item) => {
      const daily = item.dailyUsage > 0 ? item.dailyUsage : 1;
      const daysOfSupply = Math.round(item.currentStock / daily);
      const minThreshold = item.minThreshold ?? 100;
      const derived = this.deriveStatus(item.currentStock, minThreshold);

      // Projected stockout date
      const stockoutDate = new Date();
      stockoutDate.setDate(stockoutDate.getDate() + daysOfSupply);

      const activeRestockRequest = item.restockRequests.find(
        (r) => r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'CARGO_CREATED' || r.status === 'IN_TRANSIT'
      );

      return {
        ...item,
        minThreshold,
        daysOfSupply,
        stockoutDate,
        inventoryStatus: derived.status,
        riskStatus: derived.riskStatus,
        needsRestock: derived.needsRestock,
        recommendedRestock: derived.recommendedRestock,
        activeRestockRequest: activeRestockRequest || null,
      };
    });
  }

  public static async getInventoryItem(id: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        station: true,
        linkedCargo: true,
        restockRequests: true,
      },
    });
    if (!item) return null;

    const minThreshold = item.minThreshold ?? 100;
    const derived = this.deriveStatus(item.currentStock, minThreshold);
    return {
      ...item,
      minThreshold,
      inventoryStatus: derived.status,
      riskStatus: derived.riskStatus,
      needsRestock: derived.needsRestock,
      recommendedRestock: derived.recommendedRestock,
    };
  }

  public static async createInventoryItem(stationId: string, data: any, user?: any) {
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station) throw new Error(`Station ${stationId} not found`);

    const expeditionId = data.expeditionId || station.expeditionId;
    const currentStock = Number(data.currentStock ?? data.quantity ?? 0);
    const minThreshold = Number(data.minThreshold ?? data.minimumQuantity ?? 100);
    const derived = this.deriveStatus(currentStock, minThreshold);

    const item = await prisma.inventoryItem.create({
      data: {
        expeditionId,
        stationId,
        category: data.category || 'General',
        itemName: data.itemName || data.name,
        currentStock,
        unit: data.unit || 'units',
        dailyUsage: Number(data.dailyUsage) || 1,
        safetyThresholdDays: Number(data.safetyThresholdDays) || 10,
        minThreshold,
        notes: data.notes || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        replenishmentEta: data.replenishmentEta ? new Date(data.replenishmentEta) : null,
        linkedCargoId: data.linkedCargoId || null,
        riskStatus: derived.riskStatus,
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
      action: 'CREATE_INVENTORY',
      entity: 'InventoryItem',
      entityId: item.id,
      reason: `Station Manager logged new inventory: ${item.itemName} (${item.currentStock} ${item.unit}) at ${station.name}`,
    });

    return item;
  }

  public static async updateInventoryItem(id: string, data: any, user?: any) {
    const prev = await prisma.inventoryItem.findUnique({ where: { id }, include: { station: true } });
    if (!prev) throw new Error(`Inventory item ${id} not found`);

    const updateData: any = { ...data };
    if (data.currentStock !== undefined) updateData.currentStock = Number(data.currentStock);
    if (data.quantity !== undefined) updateData.currentStock = Number(data.quantity);
    if (data.minThreshold !== undefined) updateData.minThreshold = Number(data.minThreshold);
    if (data.minimumQuantity !== undefined) updateData.minThreshold = Number(data.minimumQuantity);
    if (data.dailyUsage !== undefined) updateData.dailyUsage = Number(data.dailyUsage);
    if (data.safetyThresholdDays !== undefined) updateData.safetyThresholdDays = Number(data.safetyThresholdDays);

    const stock = updateData.currentStock !== undefined ? updateData.currentStock : prev.currentStock;
    const min = updateData.minThreshold !== undefined ? updateData.minThreshold : prev.minThreshold;
    const derived = this.deriveStatus(stock, min);
    updateData.riskStatus = derived.riskStatus;

    const updated = await prisma.inventoryItem.update({
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
      action: 'UPDATE_INVENTORY',
      entity: 'InventoryItem',
      entityId: id,
      previousState: prev.currentStock,
      newState: updated.currentStock,
      reason: `Updated inventory levels for ${updated.itemName} at ${updated.station.name} (${prev.currentStock} -> ${updated.currentStock} ${updated.unit})`,
    });

    return updated;
  }

  /**
   * Station Manager initiates restock request for low/critical item.
   * Creates RestockRequest entity and global Admin alert.
   */
  public static async createRestockRequest(itemId: string, data: { requestedQuantity?: number; priority?: string; notes?: string }, user: any) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { station: true, expedition: true },
    });
    if (!item) throw new Error(`Inventory item ${itemId} not found`);

    const minThreshold = item.minThreshold ?? 100;
    const derived = this.deriveStatus(item.currentStock, minThreshold);
    const requestedQty = Number(data.requestedQuantity) || derived.recommendedRestock;
    const priority = data.priority || (derived.status === 'CRITICAL' ? 'CRITICAL' : 'HIGH');

    const restockRequest = await prisma.restockRequest.create({
      data: {
        stationId: item.stationId,
        itemId: item.id,
        requestedById: user?.id || null,
        requestedByName: user?.name || 'Station Manager',
        requestedQuantity: requestedQty,
        currentQuantity: item.currentStock,
        minimumQuantity: minThreshold,
        priority,
        status: 'PENDING',
        adminNotes: data.notes || null,
      },
      include: {
        station: true,
        item: true,
      },
    });

    // Automatically create a high-visibility global alert for Admin
    await prisma.alert.create({
      data: {
        expeditionId: item.expeditionId,
        severity: priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        title: `Inventory Shortage at ${item.station.name}`,
        source: 'INVENTORY_SHORTAGE_REQUEST',
        affectedEntity: `${item.station.name} (${item.itemName})`,
        reason: `Current stock: ${item.currentStock} ${item.unit} is below minimum threshold of ${minThreshold} ${item.unit}. Requested: ${requestedQty} ${item.unit}.`,
        impact: `Potential operational disruption at ${item.station.name} if replenishment is delayed.`,
        recommendedAction: `Review restock request and place cargo operation for ${requestedQty} ${item.unit} ${item.itemName}.`,
        status: 'ACTIVE',
      },
    });

    await RiskService.calculateAndRecordExpeditionRisk(item.expeditionId);
    await AlertService.evaluateAndSyncAlerts(item.expeditionId);

    await AuditService.record({
      expeditionId: item.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'REQUEST_RESTOCK',
      entity: 'RestockRequest',
      entityId: restockRequest.id,
      reason: `Station Manager submitted restock request for ${requestedQty} ${item.unit} of ${item.itemName} at ${item.station.name}`,
    });

    return restockRequest;
  }

  public static async listRestockRequests(filters?: { stationId?: string; status?: string }) {
    const where: any = {};
    if (filters?.stationId && filters.stationId !== 'all') {
      where.stationId = filters.stationId;
    }
    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    return prisma.restockRequest.findMany({
      where,
      include: {
        station: true,
        item: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        linkedCargo: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public static async getRestockRequest(id: string) {
    return prisma.restockRequest.findUnique({
      where: { id },
      include: {
        station: true,
        item: true,
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        linkedCargo: true,
      },
    });
  }

  /**
   * Admin converts restock request into an active Cargo Operation.
   */
  public static async fulfillWithCargo(requestId: string, cargoData: any, adminUser: any) {
    const request = await prisma.restockRequest.findUnique({
      where: { id: requestId },
      include: { item: true, station: true },
    });
    if (!request) throw new Error(`Restock request ${requestId} not found`);

    const expeditionId = cargoData.expeditionId || request.station.expeditionId;
    const cargoCode = cargoData.cargoCode || `CRG-${request.item.category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`;

    // 1. Create Cargo Shipment
    const cargo = await prisma.cargo.create({
      data: {
        expeditionId,
        cargoCode,
        description: cargoData.description || `Restock Shipment: ${request.requestedQuantity} ${request.item.unit} ${request.item.itemName} for ${request.station.name}`,
        category: request.item.category || 'General',
        weightKg: Number(cargoData.weightKg) || Number(request.requestedQuantity) * 1.5,
        quantity: Number(request.requestedQuantity),
        origin: cargoData.origin || 'Cape Town Staging Port',
        destination: `${request.station.name} (${request.station.code})`,
        currentLocation: cargoData.currentLocation || cargoData.origin || 'Cape Town Logistics Berth',
        transportMode: cargoData.transportMode || 'Snow Vehicle',
        priority: request.priority || 'HIGH',
        departureDate: new Date(cargoData.departureDate || Date.now()),
        eta: new Date(cargoData.eta || Date.now() + 86400000 * 7),
        originalEta: new Date(cargoData.eta || Date.now() + 86400000 * 7),
        delayHours: 0,
        specialRequirements: cargoData.specialRequirements || `Priority replenishment cargo linked to Request #${request.id.slice(0, 8)}`,
        status: 'IN_TRANSIT',
        vesselName: cargoData.vesselName || 'MV Polar Queen',
      },
    });

    // 2. Link Cargo to Restock Request and update status
    const updatedRequest = await prisma.restockRequest.update({
      where: { id: requestId },
      data: {
        linkedCargoId: cargo.id,
        status: 'CARGO_CREATED',
        adminNotes: cargoData.adminNotes || `Cargo dispatch ${cargo.cargoCode} assigned by ${adminUser?.name || 'Admin'}.`,
      },
      include: {
        station: true,
        item: true,
        linkedCargo: true,
      },
    });

    // 3. Update related shortage alert to IN_PROGRESS
    await prisma.alert.updateMany({
      where: {
        expeditionId,
        status: { in: ['ACTIVE', 'New'] },
        affectedEntity: { contains: request.station.name },
        title: { contains: request.item.itemName },
      },
      data: {
        status: 'IN_PROGRESS',
        impact: `Cargo ${cargo.cargoCode} dispatched. Estimated delivery ${cargo.eta.toLocaleDateString()}.`,
      },
    });

    await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
    await AlertService.evaluateAndSyncAlerts(expeditionId);

    await AuditService.record({
      expeditionId,
      userId: adminUser?.id,
      userName: adminUser?.name,
      userRole: adminUser?.role || 'ADMIN',
      action: 'DISPATCH_RESTOCK_CARGO',
      entity: 'RestockRequest',
      entityId: requestId,
      reason: `Admin created cargo shipment ${cargo.cargoCode} to fulfill restock request for ${request.item.itemName} at ${request.station.name}`,
    });

    return { request: updatedRequest, cargo };
  }

  public static async deleteInventoryItem(id: string, user?: any) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new Error(`Inventory item ${id} not found`);

    const deleted = await prisma.inventoryItem.delete({ where: { id } });
    await RiskService.calculateAndRecordExpeditionRisk(item.expeditionId);
    await AlertService.evaluateAndSyncAlerts(item.expeditionId);

    await AuditService.record({
      expeditionId: item.expeditionId,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DELETE_INVENTORY',
      entity: 'InventoryItem',
      entityId: id,
      reason: `Removed inventory record ${deleted.itemName}`,
    });

    return deleted;
  }
}

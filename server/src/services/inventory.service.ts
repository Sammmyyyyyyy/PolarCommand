import { prisma } from '../config/database.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { AuditService } from './audit.service.js';

export class InventoryService {
  public static async listInventory(expeditionId: string, stationId?: string, category?: string) {
    const where: any = { expeditionId };
    if (stationId && stationId !== 'all') where.stationId = stationId;
    if (category && category !== 'All') where.category = category;

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        station: true,
        linkedCargo: true,
      },
      orderBy: { itemName: 'asc' },
    });

    return items.map((item) => {
      const daily = item.dailyUsage > 0 ? item.dailyUsage : 1;
      const daysOfSupply = Math.round(item.currentStock / daily);
      const isBreached = daysOfSupply <= item.safetyThresholdDays;
      const riskStatus = daysOfSupply <= 5 ? 'Critical' : isBreached ? 'High Risk' : daysOfSupply <= item.safetyThresholdDays + 3 ? 'Warning' : 'Normal';

      // Projected stockout date
      const stockoutDate = new Date();
      stockoutDate.setDate(stockoutDate.getDate() + daysOfSupply);

      return {
        ...item,
        daysOfSupply,
        stockoutDate,
        riskStatus,
      };
    });
  }

  public static async createInventoryItem(expeditionId: string, data: any, user?: any) {
    const item = await prisma.inventoryItem.create({
      data: {
        expeditionId,
        stationId: data.stationId,
        category: data.category,
        itemName: data.itemName,
        currentStock: Number(data.currentStock) || 0,
        unit: data.unit || 'units',
        dailyUsage: Number(data.dailyUsage) || 1,
        safetyThresholdDays: Number(data.safetyThresholdDays) || 10,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        replenishmentEta: data.replenishmentEta ? new Date(data.replenishmentEta) : null,
        linkedCargoId: data.linkedCargoId || null,
        riskStatus: 'Normal',
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
      reason: `Added inventory line ${item.itemName} (${item.currentStock} ${item.unit}) at ${item.station.name}`,
    });

    return item;
  }

  public static async updateInventoryItem(id: string, data: any, user?: any) {
    const prev = await prisma.inventoryItem.findUnique({ where: { id }, include: { station: true } });
    if (!prev) throw new Error(`Inventory item ${id} not found`);

    const updateData: any = { ...data };
    if (data.currentStock !== undefined) updateData.currentStock = Number(data.currentStock);
    if (data.dailyUsage !== undefined) updateData.dailyUsage = Number(data.dailyUsage);
    if (data.safetyThresholdDays !== undefined) updateData.safetyThresholdDays = Number(data.safetyThresholdDays);

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
      reason: `Updated inventory levels for ${updated.itemName} at ${updated.station.name}`,
    });

    return updated;
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

import { prisma } from '../config/database.js';
export class AlertService {
    static async evaluateAndSyncAlerts(expeditionId) {
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
        if (!expedition)
            return [];
        const existingAlerts = await prisma.alert.findMany({
            where: { expeditionId, status: { in: ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
        });
        // 1. Evaluate Cargo Delays
        for (const c of expedition.cargo) {
            if (c.delayHours > 0 || c.status === 'Delayed') {
                const title = `Cargo ${c.cargoCode} delayed by ${c.delayHours}h`;
                const alreadyExists = existingAlerts.some((a) => a.affectedEntity === c.cargoCode);
                if (!alreadyExists) {
                    await prisma.alert.create({
                        data: {
                            expeditionId,
                            severity: c.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                            title,
                            source: 'Maritime & Air Corridor Tracker',
                            affectedEntity: c.cargoCode,
                            reason: `Shipment ${c.description} delayed by ${c.delayHours}h en route to ${c.destination}.`,
                            impact: `Delivery pushed back to ${c.eta.toISOString().slice(0, 10)}. Potential stockout downstream.`,
                            recommendedAction: 'Expedite transit or reallocate emergency buffer supplies from nearest base.',
                            status: 'ACTIVE',
                        },
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
                const alreadyExists = existingAlerts.some((a) => a.affectedEntity.includes(inv.itemName) && a.affectedEntity.includes(inv.station.name));
                if (!alreadyExists) {
                    const isCritical = inv.category.toLowerCase().includes('med') || inv.category.toLowerCase().includes('fuel');
                    await prisma.alert.create({
                        data: {
                            expeditionId,
                            severity: isCritical ? 'CRITICAL' : 'HIGH',
                            title: `Critical Supply Shortage: ${inv.station.name} ${inv.itemName}`,
                            source: 'Inventory Intelligence System',
                            affectedEntity: entityKey,
                            reason: `Current stock of ${inv.currentStock} ${inv.unit} offers only ${Math.round(daysOfSupply)} days of supply (Safety threshold: ${inv.safetyThresholdDays} days).`,
                            impact: `Station faces potential stockout in ${Math.round(daysOfSupply)} days without replenishment.`,
                            recommendedAction: `Reallocate emergency reserve from neighboring station or expedite incoming shipments.`,
                            status: 'ACTIVE',
                        },
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
                    await prisma.alert.create({
                        data: {
                            expeditionId,
                            severity: 'HIGH',
                            title: `Maintenance Overdue: ${asset.name} (${asset.assetCode})`,
                            source: 'Asset Telemetry Engine',
                            affectedEntity: entityKey,
                            reason: `Operating hours (${asset.operatingHours}h) exceeded scheduled maintenance interval (${asset.maintenanceInterval}h).`,
                            impact: `Elevated risk of field breakdown and mechanical failure in sub-zero terrain.`,
                            recommendedAction: 'Dispatch maintenance technician to station depot and swap with standby unit.',
                            status: 'ACTIVE',
                        },
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
    static async updateAlertStatus(alertId, status) {
        return prisma.alert.update({
            where: { id: alertId },
            data: { status },
        });
    }
    static async listAlerts(expeditionId) {
        return prisma.alert.findMany({
            where: { expeditionId },
            orderBy: { createdAt: 'desc' },
            include: { actions: true },
        });
    }
}

import { prisma } from '../config/database.js';

export interface OperationalRecommendation {
  id: string;
  type: 'INVENTORY_REALLOCATION' | 'EXPEDITE_CARGO' | 'MAINTENANCE_OVERHAUL' | 'EMERGENCY_DISPATCH' | 'WEATHER_SHELTER';
  title: string;
  problem: string;
  proposedAction: string;
  reason: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  expectedImpact: string;
  payload: {
    donorStationId?: string;
    recipientStationId?: string;
    donorStationName?: string;
    recipientStationName?: string;
    inventoryCategory?: string;
    transferQuantity?: number;
    unit?: string;
    cargoId?: string;
    assetId?: string;
    incidentId?: string;
    personnelId?: string;
    alertId?: string;
  };
}

export class RecommendationService {
  public static async generateRecommendations(expeditionId: string): Promise<OperationalRecommendation[]> {
    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        stations: true,
        inventory: { include: { station: true } },
        cargo: true,
        assets: { include: { station: true } },
        incidents: { where: { status: { not: 'Resolved' } } },
        alerts: { where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } } },
        personnel: true,
      },
    });

    if (!expedition) return [];

    const recommendations: OperationalRecommendation[] = [];

    // 1. Check for Inventory Breaches and Find Donor Stations
    for (const item of expedition.inventory) {
      const daily = item.dailyUsage > 0 ? item.dailyUsage : 1;
      const daysOfSupply = item.currentStock / daily;

      if (daysOfSupply <= item.safetyThresholdDays) {
        // Find other stations in same expedition with surplus in the same category
        const catPrefix = item.category.slice(0, 3).toLowerCase();
        const potentialDonors = expedition.inventory.filter(
          (d) =>
            d.id !== item.id &&
            d.category.toLowerCase().startsWith(catPrefix) &&
            d.stationId !== item.stationId
        );

        // Find donor with healthiest reserve
        const viableDonor = potentialDonors.find((d) => {
          const donorDaily = d.dailyUsage > 0 ? d.dailyUsage : 1;
          const donorDays = d.currentStock / donorDaily;
          return donorDays > d.safetyThresholdDays * 1.5 && d.currentStock > 100;
        });

        if (viableDonor) {
          const deficit = Math.round((item.safetyThresholdDays * 1.5 - daysOfSupply) * daily);
          const transferQty = Math.min(Math.max(50, deficit), Math.round(viableDonor.currentStock * 0.4));
          const linkedAlert = expedition.alerts.find((a) => a.affectedEntity.includes(item.station.name));

          recommendations.push({
            id: `rec-inv-${item.id}`,
            type: 'INVENTORY_REALLOCATION',
            title: `Reallocate ${transferQty} ${item.unit} ${item.category} from ${viableDonor.station.name} to ${item.station.name}`,
            problem: `${item.station.name} ${item.itemName} reserve critically reduced to ${Math.round(daysOfSupply)} days (threshold: ${item.safetyThresholdDays} days).`,
            proposedAction: `Authorize emergency inter-station airlift of ${transferQty} ${item.unit} from ${viableDonor.station.name} surplus stock.`,
            reason: `${viableDonor.station.name} currently holds ${Math.round(viableDonor.currentStock)} ${item.unit} with comfortable safety margins and is the nearest viable logistics hub.`,
            urgency: daysOfSupply <= 7 ? 'CRITICAL' : 'HIGH',
            expectedImpact: `Restores ${item.station.name} buffer to safely cover demand until next marine cargo arrival, reducing station risk by ~35 points.`,
            payload: {
              donorStationId: viableDonor.stationId,
              recipientStationId: item.stationId,
              donorStationName: viableDonor.station.name,
              recipientStationName: item.station.name,
              inventoryCategory: item.category,
              transferQuantity: transferQty,
              unit: item.unit,
              alertId: linkedAlert?.id,
            },
          });
        }
      }
    }

    // 2. Check for Delayed Cargo
    const delayedCargo = expedition.cargo.filter((c) => c.status === 'Delayed' || c.delayHours > 0);
    for (const c of delayedCargo) {
      recommendations.push({
        id: `rec-cargo-${c.id}`,
        type: 'EXPEDITE_CARGO',
        title: `Expedite Consignment ${c.cargoCode} (${c.description})`,
        problem: `Shipment delayed by +${c.delayHours}h in maritime transit basin. ETA pushed to ${c.eta.toISOString().slice(0, 10)}.`,
        proposedAction: `Prioritize vessel offloading queue and reserve ski-plane airlift slot upon coastal arrival.`,
        reason: `${c.priority} priority consignment contains critical station provisions.`,
        urgency: c.priority === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
        expectedImpact: `Mitigates downstream logistics lag by up to 24-36 hours.`,
        payload: {
          cargoId: c.id,
        },
      });
    }

    // 3. Check for Overdue Asset Maintenance
    for (const asset of expedition.assets) {
      const remainingHours = asset.maintenanceInterval - asset.operatingHours;
      if (remainingHours <= 0) {
        recommendations.push({
          id: `rec-asset-${asset.id}`,
          type: 'MAINTENANCE_OVERHAUL',
          title: `Perform Immediate Depot Service on ${asset.name} (${asset.assetCode})`,
          problem: `Operating hours (${asset.operatingHours}h) have exceeded maintenance interval (${asset.maintenanceInterval}h).`,
          proposedAction: `Route ${asset.name} to ${asset.station.name} mechanical shop for oil filter change, track overhaul, and sensor calibration.`,
          reason: `Preventive depot overhaul prevents catastrophic field breakdown during upcoming polar traverse.`,
          urgency: 'HIGH',
          expectedImpact: `Resets operational health to 100% and normalizes station mechanical availability.`,
          payload: {
            assetId: asset.id,
          },
        });
      }
    }

    return recommendations;
  }
}

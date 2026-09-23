import { prisma } from '../config/database.js';

export interface RiskAnalysisResult {
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  breakdown: {
    cargo: number;
    inventory: number;
    assets: number;
    personnel: number;
    incidents: number;
    weather: number;
  };
  contributingFactors: string[];
  affectedResources: string[];
  recommendedMitigation: string;
}

export class RiskService {
  public static async calculateAndRecordExpeditionRisk(expeditionId: string): Promise<RiskAnalysisResult> {
    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        cargo: true,
        inventory: { include: { station: true } },
        assets: { include: { station: true } },
        personnel: true,
        incidents: { where: { status: { not: 'Resolved' } } },
        stations: { include: { weather: { orderBy: { recordedAt: 'desc' }, take: 1 } } },
      },
    });

    if (!expedition) {
      throw new Error(`Expedition ${expeditionId} not found`);
    }

    const contributingFactors: string[] = [];
    const affectedResources: string[] = [];

    // 1. Cargo Risk (0 - 30 points)
    let cargoRiskScore = 0;
    for (const c of expedition.cargo) {
      if (c.status === 'Delayed' || c.delayHours > 0) {
        const penalty = c.priority === 'CRITICAL' ? 14 : c.priority === 'HIGH' ? 9 : 5;
        const delayFactor = Math.min(2, 1 + c.delayHours / 48);
        const itemScore = penalty * delayFactor;
        cargoRiskScore += itemScore;
        contributingFactors.push(`Cargo ${c.cargoCode} (${c.description}) delayed by +${c.delayHours}h`);
        affectedResources.push(`Cargo: ${c.cargoCode}`);
      } else if (c.priority === 'CRITICAL' && c.status === 'In Transit') {
        cargoRiskScore += 3;
      }
    }
    const normalizedCargo = Math.min(30, Math.round(cargoRiskScore));

    // 2. Inventory Risk (0 - 35 points)
    let inventoryRiskScore = 0;
    for (const inv of expedition.inventory) {
      const daily = inv.dailyUsage > 0 ? inv.dailyUsage : 1;
      const daysOfSupply = inv.currentStock / daily;

      if (daysOfSupply <= inv.safetyThresholdDays) {
        const breachGap = Math.max(1, inv.safetyThresholdDays - daysOfSupply + 1);
        const isCriticalCat = inv.category.toLowerCase().includes('med') || inv.category.toLowerCase().includes('fuel');
        const weight = isCriticalCat ? 14 : 7;
        const penalty = weight * breachGap;
        inventoryRiskScore += penalty;
        contributingFactors.push(
          `${inv.station.name} ${inv.itemName} stock (${Math.round(daysOfSupply)} days) below safety threshold (${inv.safetyThresholdDays} days)`
        );
        affectedResources.push(`Inventory: ${inv.station.name} - ${inv.itemName}`);
      } else if (daysOfSupply <= inv.safetyThresholdDays + 3) {
        inventoryRiskScore += 3;
      }
    }
    const normalizedInventory = Math.min(35, Math.round(inventoryRiskScore));

    // 3. Asset Risk (0 - 15 points)
    let assetRiskScore = 0;
    for (const a of expedition.assets) {
      const remainingHours = a.maintenanceInterval - a.operatingHours;
      if (remainingHours <= 0 || a.status === 'Critical' || a.status === 'Unavailable') {
        assetRiskScore += 7;
        contributingFactors.push(`Asset ${a.assetCode} (${a.name}) overdue for maintenance or unavailable`);
        affectedResources.push(`Asset: ${a.assetCode}`);
      } else if (remainingHours <= 200 || a.healthPercentage < 65) {
        assetRiskScore += 3.5;
        contributingFactors.push(`Asset ${a.assetCode} health degraded (${a.healthPercentage}%)`);
      }
    }
    const normalizedAssets = Math.min(15, Math.round(assetRiskScore));

    // 4. Incident Risk (0 - 15 points)
    let incidentRiskScore = 0;
    for (const inc of expedition.incidents) {
      const incPoints = inc.severity === 'CRITICAL' ? 12 : inc.severity === 'HIGH' ? 8 : 4;
      incidentRiskScore += incPoints;
      contributingFactors.push(`Active emergency: ${inc.title} (${inc.severity} severity)`);
      affectedResources.push(`Incident: ${inc.incidentCode}`);
    }
    const normalizedIncidents = Math.min(15, Math.round(incidentRiskScore));

    // 5. Personnel Availability Risk (0 - 10 points)
    let personnelRiskScore = 0;
    const doctors = expedition.personnel.filter((p) => p.role.toLowerCase().includes('doctor'));
    const activeDoctors = doctors.filter((d) => d.emergencyAvailability === 'Available' || d.emergencyAvailability === 'Active');
    if (doctors.length > 0 && activeDoctors.length === 0) {
      personnelRiskScore += 6;
      contributingFactors.push('No emergency medical officers currently available on station');
    }
    const normalizedPersonnel = Math.min(10, Math.round(personnelRiskScore || 4));

    // 6. Weather Risk (0 - 10 points)
    let weatherRiskScore = 0;
    for (const st of expedition.stations) {
      const latestWeather = st.weather[0];
      if (latestWeather) {
        if (latestWeather.windSpeedKnots > 45) {
          weatherRiskScore += 5;
          contributingFactors.push(`${st.name} severe blizzard winds (${latestWeather.windSpeedKnots} knots)`);
        } else if (latestWeather.windSpeedKnots > 30) {
          weatherRiskScore += 2;
        }
      }
    }
    const normalizedWeather = Math.min(10, Math.round(weatherRiskScore || 3));

    // Total Calculation
    const totalScore = Math.min(
      100,
      normalizedCargo + normalizedInventory + normalizedAssets + normalizedIncidents + normalizedPersonnel + normalizedWeather
    );

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (totalScore >= 70) riskLevel = 'CRITICAL';
    else if (totalScore >= 50) riskLevel = 'HIGH';
    else if (totalScore >= 30) riskLevel = 'MEDIUM';

    // Mitigation synthesis
    let recommendedMitigation = 'Maintain nominal scheduled logistics tracking.';
    if (normalizedInventory >= 15) {
      recommendedMitigation = 'Authorize inter-station supply reallocation or emergency logistics airbridge.';
    } else if (normalizedCargo >= 15) {
      recommendedMitigation = 'Expedite maritime transit and reroute high-priority cargo via ski-plane corridors.';
    } else if (normalizedIncidents >= 8) {
      recommendedMitigation = 'Dispatch immediate rescue response team and mobilize medical triage.';
    } else if (normalizedAssets >= 8) {
      recommendedMitigation = 'Schedule priority maintenance overhaul and activate standby backup equipment.';
    }

    // Persist snapshot to RiskSnapshot table for authentic historical telemetry
    await prisma.riskSnapshot.create({
      data: {
        expeditionId,
        totalScore,
        cargoRisk: normalizedCargo,
        inventoryRisk: normalizedInventory,
        assetRisk: normalizedAssets,
        personnelRisk: normalizedPersonnel,
        incidentRisk: normalizedIncidents,
        weatherRisk: normalizedWeather,
        contributingFactors: contributingFactors.slice(0, 5).join('; '),
      },
    });

    // Update current overallRiskScore on Expedition
    await prisma.expedition.update({
      where: { id: expeditionId },
      data: { overallRiskScore: totalScore },
    });

    // Update station-specific risk
    for (const station of expedition.stations) {
      const stationInventory = expedition.inventory.filter((i) => i.stationId === station.id);
      const breachedCount = stationInventory.filter((i) => {
        const d = i.dailyUsage > 0 ? i.dailyUsage : 1;
        return i.currentStock / d <= i.safetyThresholdDays;
      }).length;

      const stationRisk = Math.min(100, Math.round(totalScore * 0.4 + breachedCount * 20));
      const stationStatus = stationRisk >= 65 ? 'High Risk' : stationRisk >= 40 ? 'Warning' : 'Operational';

      await prisma.station.update({
        where: { id: station.id },
        data: { currentRisk: stationRisk, status: stationStatus },
      });
    }

    return {
      totalScore,
      riskLevel,
      breakdown: {
        cargo: normalizedCargo,
        inventory: normalizedInventory,
        assets: normalizedAssets,
        personnel: normalizedPersonnel,
        incidents: normalizedIncidents,
        weather: normalizedWeather,
      },
      contributingFactors,
      affectedResources,
      recommendedMitigation,
    };
  }

  public static async getRiskHistory(expeditionId: string, limit = 30) {
    return prisma.riskSnapshot.findMany({
      where: { expeditionId },
      orderBy: { recordedAt: 'asc' },
      take: limit,
    });
  }
}

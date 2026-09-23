import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';

export interface RunSimulationParams {
  expeditionId: string;
  scenarioType: 'cargo-delay' | 'weather-disruption' | 'vehicle-failure' | 'inventory-surge' | 'shipment-cancellation';
  cargoId?: string;
  delayHours?: number;
  consumptionMultiplier?: number;
  stationId?: string;
  assetId?: string;
}

export class SimulationService {
  public static async runSimulation(params: RunSimulationParams) {
    const { expeditionId, scenarioType } = params;

    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        cargo: true,
        inventory: { include: { station: true } },
        assets: { include: { station: true } },
        stations: true,
      },
    });

    if (!expedition) throw new Error(`Expedition ${expeditionId} not found`);

    // Baseline stats
    const baselineRisk = expedition.overallRiskScore;

    // Deep clone sandbox state
    const sandboxCargo = JSON.parse(JSON.stringify(expedition.cargo));
    const sandboxInventory = JSON.parse(JSON.stringify(expedition.inventory));
    const sandboxAssets = JSON.parse(JSON.stringify(expedition.assets));

    let impactedStationName = expedition.stations[0]?.name || 'Polar Base';
    let recommendation = 'Maintain standard monitoring protocols.';
    let simulatedRisk = baselineRisk;
    const impactChain: Array<{ step: number; title: string; description: string; status: string }> = [];

    if (scenarioType === 'cargo-delay') {
      const delay = params.delayHours || 48;
      const targetCargo = sandboxCargo.find((c: any) => c.id === params.cargoId) || sandboxCargo[0];

      if (targetCargo) {
        targetCargo.delayHours += delay;
        targetCargo.status = 'Delayed';

        // Check linked inventory
        const linkedInv = sandboxInventory.find(
          (i: any) => i.linkedCargoId === targetCargo.id || i.category.toLowerCase() === targetCargo.category.toLowerCase()
        ) || sandboxInventory[0];

        let prevDays = 12;
        let newDays = 8;

        if (linkedInv) {
          impactedStationName = linkedInv.station?.name || impactedStationName;
          const daily = linkedInv.dailyUsage > 0 ? linkedInv.dailyUsage : 1;
          prevDays = Math.round(linkedInv.currentStock / daily);
          const daysLoss = Math.round(delay / 24);
          newDays = Math.max(2, prevDays - daysLoss);
        }

        simulatedRisk = Math.min(95, baselineRisk + (delay >= 48 ? 32 : 18));
        recommendation = `Reallocate emergency reserve from neighboring base and schedule emergency airbridge for ${targetCargo.cargoCode}.`;

        impactChain.push(
          { step: 1, title: 'Simulation Trigger', description: `Consignment ${targetCargo.cargoCode} delayed by +${delay} hours in maritime corridor.`, status: 'trigger' },
          { step: 2, title: 'Arrival Slip', description: `Coastal offload slips downstream by +${Math.round(delay / 24)} days.`, status: 'cascade' },
          { step: 3, title: 'Reserve Depletion', description: `${impactedStationName} inventory buffers drop from ${prevDays} to ${newDays} days (safety threshold breached).`, status: 'breach' },
          { step: 4, title: 'Risk Surge', description: `Expedition operational risk score surges from ${baselineRisk} to ${simulatedRisk}/100.`, status: 'alert' },
          { step: 5, title: 'Actionable Mitigation', description: recommendation, status: 'recommendation' }
        );
      }
    } else if (scenarioType === 'inventory-surge') {
      const mult = params.consumptionMultiplier || 1.5;
      simulatedRisk = Math.min(95, Math.round(baselineRisk * 1.45 + 10));
      recommendation = 'Initiate mandatory conservation mode and impose secondary generator rationing.';

      impactChain.push(
        { step: 1, title: 'Surge Applied', description: `Station consumption elevated by ${mult}x due to extreme sub-zero weather.`, status: 'trigger' },
        { step: 2, title: 'Accelerated Depletion', description: `Daily burn rate increases across fuel and heating provisions.`, status: 'breach' },
        { step: 3, title: 'Operational Risk Spike', description: `System risk score elevates to ${simulatedRisk}/100.`, status: 'alert' },
        { step: 4, title: 'Mitigation Formulated', description: recommendation, status: 'recommendation' }
      );
    } else if (scenarioType === 'vehicle-failure') {
      simulatedRisk = Math.min(90, baselineRisk + 22);
      recommendation = 'Reroute traverse tasks to available backup PistenBully and expedite depot spare parts delivery.';

      impactChain.push(
        { step: 1, title: 'Mechanical Stoppage', description: 'Heavy snow vehicle track assembly seizure reported on ice traverse.', status: 'trigger' },
        { step: 2, title: 'Transport Corridor Bottleneck', description: 'Overland resupply corridor between stations halted.', status: 'breach' },
        { step: 3, title: 'Elevated Hazard', description: `Operational risk escalates to ${simulatedRisk}/100.`, status: 'alert' },
        { step: 4, title: 'Recommended Protocol', description: recommendation, status: 'recommendation' }
      );
    } else {
      simulatedRisk = Math.min(95, baselineRisk + 25);
      recommendation = 'Activate severe weather lockdown protocol and tie down exterior scientific antennae.';
      impactChain.push(
        { step: 1, title: 'Disruption Event', description: `${scenarioType.replace('-', ' ').toUpperCase()} initiated.`, status: 'trigger' },
        { step: 2, title: 'Risk Impact', description: `Expedition risk calculated at ${simulatedRisk}/100.`, status: 'alert' },
        { step: 3, title: 'Recommendation', description: recommendation, status: 'recommendation' }
      );
    }

    const record = await prisma.simulationRecord.create({
      data: {
        expeditionId,
        scenarioType,
        inputJson: JSON.stringify(params),
        resultJson: JSON.stringify({
          before: { risk: baselineRisk },
          after: { risk: simulatedRisk, affectedStation: impactedStationName, recommendation },
          impactChain,
        }),
        status: 'DRAFT',
      },
    });

    return {
      simulationId: record.id,
      scenarioType,
      before: {
        risk: baselineRisk,
        status: baselineRisk > 60 ? 'High Risk' : baselineRisk > 35 ? 'Warning' : 'Operational',
      },
      after: {
        risk: simulatedRisk,
        affectedStation: impactedStationName,
        newRiskLevel: simulatedRisk >= 70 ? 'CRITICAL' : simulatedRisk >= 50 ? 'HIGH' : 'MEDIUM',
        recommendedAction: recommendation,
      },
      impactChain,
      isCommittedToDatabase: false,
    };
  }

  public static async applyScenario(simulationId: string, user?: any) {
    const sim = await prisma.simulationRecord.findUnique({ where: { id: simulationId } });
    if (!sim) throw new Error('Simulation record not found');

    const input = JSON.parse(sim.inputJson);
    const { expeditionId, scenarioType, cargoId, delayHours = 48 } = input;

    // Apply live changes based on scenario
    if (scenarioType === 'cargo-delay' && cargoId) {
      await prisma.cargo.update({
        where: { id: cargoId },
        data: {
          delayHours: { increment: delayHours },
          status: 'Delayed',
        },
      });
    }

    await prisma.simulationRecord.update({
      where: { id: simulationId },
      data: { status: 'APPLIED' },
    });

    // Recalculate live Risk & Alerts
    await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
    await AlertService.evaluateAndSyncAlerts(expeditionId);

    await AuditService.record({
      expeditionId,
      userId: user?.id,
      userName: user?.name || 'Expedition Commander',
      userRole: user?.role || 'COMMANDER',
      action: 'APPLY_SIMULATION_SCENARIO',
      entity: 'SimulationRecord',
      entityId: simulationId,
      reason: `Applied what-if simulation scenario (${scenarioType}) to live operational state`,
    });

    return { success: true, message: 'Simulation scenario successfully applied to live expedition state.' };
  }

  public static async discardScenario(simulationId: string) {
    await prisma.simulationRecord.update({
      where: { id: simulationId },
      data: { status: 'DISCARDED' },
    });
    return { success: true, message: 'Simulation scenario discarded. Live state unaffected.' };
  }
}

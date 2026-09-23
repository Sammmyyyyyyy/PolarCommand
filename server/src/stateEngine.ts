import {
  INITIAL_EXPEDITION,
  INITIAL_STATIONS,
  INITIAL_CARGO,
  INITIAL_INVENTORY,
  INITIAL_ASSETS,
  INITIAL_PERSONNEL,
  INITIAL_INCIDENTS,
  INITIAL_ALERTS,
  INITIAL_ACTIONS,
} from './mockData.js';
import {
  Expedition,
  Station,
  CargoShipment,
  InventoryItem,
  Asset,
  Personnel,
  Incident,
  Alert,
  ActionItem,
  DashboardSummary,
  CargoDelaySimulationResponse,
  VehicleAllocationPlan,
} from './types.js';
import { calculateExpeditionRisk } from './riskEngine.js';

class StateEngine {
  private expedition: Expedition = JSON.parse(JSON.stringify(INITIAL_EXPEDITION));
  private stations: Station[] = JSON.parse(JSON.stringify(INITIAL_STATIONS));
  private cargo: CargoShipment[] = JSON.parse(JSON.stringify(INITIAL_CARGO));
  private inventory: InventoryItem[] = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
  private assets: Asset[] = JSON.parse(JSON.stringify(INITIAL_ASSETS));
  private personnel: Personnel[] = JSON.parse(JSON.stringify(INITIAL_PERSONNEL));
  private incidents: Incident[] = JSON.parse(JSON.stringify(INITIAL_INCIDENTS));
  private alerts: Alert[] = JSON.parse(JSON.stringify(INITIAL_ALERTS));
  private actions: ActionItem[] = JSON.parse(JSON.stringify(INITIAL_ACTIONS));

  constructor() {
    this.recalculateAll();
  }

  public resetDemo(): void {
    this.expedition = JSON.parse(JSON.stringify(INITIAL_EXPEDITION));
    this.stations = JSON.parse(JSON.stringify(INITIAL_STATIONS));
    this.cargo = JSON.parse(JSON.stringify(INITIAL_CARGO));
    this.inventory = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
    this.assets = JSON.parse(JSON.stringify(INITIAL_ASSETS));
    this.personnel = JSON.parse(JSON.stringify(INITIAL_PERSONNEL));
    this.incidents = JSON.parse(JSON.stringify(INITIAL_INCIDENTS));
    this.alerts = JSON.parse(JSON.stringify(INITIAL_ALERTS));
    this.actions = JSON.parse(JSON.stringify(INITIAL_ACTIONS));
    this.recalculateAll();
  }

  public recalculateAll(): void {
    const risk = calculateExpeditionRisk(this.cargo, this.inventory, this.assets, this.stations);
    this.expedition.overallRiskScore = risk.total;
    this.expedition.activeAlertsCount = this.alerts.filter((a) => a.status !== 'Resolved').length;
  }

  public getDashboard(): DashboardSummary {
    this.recalculateAll();
    const riskBreakdown = calculateExpeditionRisk(this.cargo, this.inventory, this.assets, this.stations);

    const delayedCargoCount = this.cargo.filter((c) => c.status === 'Delayed' || c.delayHours > 0).length;
    const inventoryRiskItems = this.inventory.filter((i) => i.daysRemaining <= i.safetyThresholdDays).length;
    const operationalAssets = this.assets.filter((a) => a.status === 'Operational').length;
    const personnelInTransit = this.personnel.filter((p) => p.status === 'In Transit').length;

    return {
      expedition: this.expedition,
      kpi: {
        personnel: this.personnel.length,
        cargoShipments: this.expedition.totalCargoCount,
        assets: 23,
        inventoryReadiness: this.calculateInventoryReadiness(),
        activeAlerts: this.alerts.filter((a) => a.status !== 'Resolved').length,
        overallRisk: this.expedition.overallRiskScore,
        riskBreakdown,
      },
      operationalStrip: {
        inventoryRiskItems,
        delayedCargoCount,
        operationalAssetsCount: `${operationalAssets}/23 operational`,
        personnelInTransitCount: personnelInTransit,
        stationsSummary: this.stations.map((s) => ({
          name: s.name.replace(' Station', ''),
          status: s.status,
          riskLevel: s.riskLevel,
        })),
      },
      alerts: this.alerts,
      stations: this.stations,
    };
  }

  private calculateInventoryReadiness(): number {
    const totalItems = this.inventory.length;
    if (totalItems === 0) return 91;
    const healthyItems = this.inventory.filter((i) => i.daysRemaining > i.safetyThresholdDays).length;
    return Math.round((healthyItems / totalItems) * 100);
  }

  // Expedition
  public getExpeditions(): Expedition[] {
    return [this.expedition];
  }

  public getExpedition(id: string): Expedition | undefined {
    return this.expedition.id === id || this.expedition.code.toLowerCase() === id.toLowerCase()
      ? this.expedition
      : undefined;
  }

  // Stations
  public getStations(): Station[] {
    return this.stations;
  }

  public getStation(id: string): Station | undefined {
    return this.stations.find((s) => s.id.toLowerCase() === id.toLowerCase());
  }

  // Cargo
  public getCargo(): CargoShipment[] {
    return this.cargo;
  }

  public getCargoItem(id: string): CargoShipment | undefined {
    return this.cargo.find((c) => c.id.toLowerCase() === id.toLowerCase());
  }

  // Hero Scenario & Delay Simulation
  public simulateCargoDelay(cargoId: string, delayHours: number): CargoDelaySimulationResponse {
    const item = this.cargo.find((c) => c.id.toLowerCase() === cargoId.toLowerCase());
    if (!item) {
      throw new Error(`Cargo item ${cargoId} not found`);
    }

    const previousOverallRisk = this.expedition.overallRiskScore;
    const bharati = this.stations.find((s) => s.id === 'bharati')!;
    const previousStationRisk = bharati.stationRisk;

    // Apply delay
    item.delayHours = delayHours;
    item.status = 'Delayed';
    item.eta = `${14 + Math.floor(delayHours / 24)} Jan, 18:00`;
    item.riskScore = Math.min(95, item.riskScore + (delayHours >= 48 ? 20 : 10));
    item.riskLevel = item.riskScore > 70 ? 'Critical' : 'High';
    item.riskBreakdown.delayImpact += delayHours >= 48 ? 20 : 10;

    // Check linked inventory
    const medInv = this.inventory.find((i) => i.linkedCargoId === item.id || (item.category === 'Medical' && i.stationId === 'bharati'));
    let previousDaysRemaining = 11;
    let newDaysRemaining = 9;

    if (medInv) {
      previousDaysRemaining = medInv.daysRemaining;
      if (delayHours >= 48) {
        medInv.daysRemaining = Math.max(5, medInv.daysRemaining - 2); // Drops below 10-day safety threshold!
        medInv.riskStatus = 'High Risk';
      } else {
        medInv.daysRemaining = Math.max(8, medInv.daysRemaining - 1);
        medInv.riskStatus = 'Warning';
      }
      newDaysRemaining = medInv.daysRemaining;
    }

    // Station risk spikes
    bharati.stationRisk = delayHours >= 48 ? 71 : 55;
    bharati.riskLevel = 'High Risk';

    // Create or escalate alert
    const existingAlert = this.alerts.find((a) => a.id === 'alt-01' || a.affectedEntity.includes(item.id));
    let alertObj: Alert;
    if (existingAlert) {
      existingAlert.severity = 'CRITICAL';
      existingAlert.title = `Medical cargo delayed by ${delayHours}h`;
      existingAlert.reason = `Shipment delayed ${delayHours}h in Cape Town basin due to sea pack ice.`;
      existingAlert.impact = `Bharati medical reserve dropped to ${newDaysRemaining} days (below 10-day safety threshold).`;
      existingAlert.recommendedAction = 'Reallocate 150 medical units from Maitri and prioritize MED-024.';
      existingAlert.status = 'In Progress';
      alertObj = existingAlert;
    } else {
      alertObj = {
        id: `alt-${Date.now()}`,
        severity: 'CRITICAL',
        title: `Medical cargo delayed by ${delayHours}h`,
        affectedEntity: `${item.id} • Bharati`,
        source: 'Cargo Delay Simulation',
        timestamp: 'Just now',
        reason: `Vessel transit slowed. ETA shifted +${delayHours}h.`,
        impact: `Bharati medical reserve drops from ${previousDaysRemaining} to ${newDaysRemaining} days.`,
        recommendedAction: 'Reallocate 150 units from Maitri and prioritize MED-024.',
        status: 'In Progress',
      };
      this.alerts.unshift(alertObj);
    }

    this.recalculateAll();

    return {
      cargo: item,
      impact: {
        stationAffected: 'Bharati Station',
        inventoryCategoryAffected: 'Medicine',
        previousDaysRemaining,
        newDaysRemaining,
        previousStationRisk,
        newStationRisk: bharati.stationRisk,
        previousOverallRisk,
        newOverallRisk: this.expedition.overallRiskScore,
        alertCreated: alertObj,
        recommendedAction: 'Reallocate 150 medical units from Maitri and prioritize shipment MED-024.',
        impactChain: [
          {
            step: 1,
            title: 'Cargo Delay Triggered',
            description: `Shipment ${item.id} delayed by +${delayHours}h at Cape Town Staging.`,
            status: 'trigger',
          },
          {
            step: 2,
            title: 'Arrival Schedule Slip',
            description: `Antarctic offload pushed back to ${item.eta}.`,
            status: 'cascade',
          },
          {
            step: 3,
            title: 'Inventory Threshold Breach',
            description: `Bharati medical reserves dropped from ${previousDaysRemaining} to ${newDaysRemaining} days (critical 10-day safety threshold breached).`,
            status: 'breach',
          },
          {
            step: 4,
            title: 'Station Risk Surge',
            description: `Bharati station operational risk surged from ${previousStationRisk} to ${bharati.stationRisk} / 100.`,
            status: 'cascade',
          },
          {
            step: 5,
            title: 'Operational Alert Dispatched',
            description: 'CRITICAL severity alert broadcast to Expedition Commander dashboard.',
            status: 'alert',
          },
          {
            step: 6,
            title: 'Actionable Recommendation Formulated',
            description: 'Reallocate 150 medical units from Maitri Station surplus via inter-station ski-plane link.',
            status: 'recommendation',
          },
        ],
      },
    };
  }

  // Execute Hero Action (Reallocate emergency medical reserve)
  public executeHeroAction(): { success: boolean; message: string; recoveredRisk: number } {
    const medInv = this.inventory.find((i) => i.id === 'inv-bh-med')!;
    if (medInv) {
      medInv.currentStock = 370; // 220 + 150 from Maitri
      medInv.daysRemaining = 24;
      medInv.riskStatus = 'Normal';
    }

    const maitriMed = this.inventory.find((i) => i.id === 'inv-mt-med');
    if (maitriMed) {
      maitriMed.currentStock -= 150;
      maitriMed.daysRemaining = 35;
    }

    const bharati = this.stations.find((s) => s.id === 'bharati')!;
    bharati.stationRisk = 32;
    bharati.riskLevel = 'Normal';

    // Resolve alert
    const alert = this.alerts.find((a) => a.id === 'alt-01' || a.title.includes('Medical cargo'));
    if (alert) {
      alert.status = 'Resolved';
    }

    // Complete action
    const action = this.actions.find((a) => a.id === 'act-001' || a.title.includes('Reallocate'));
    if (action) {
      action.status = 'Completed';
      action.executedAt = 'Just now';
    }

    this.recalculateAll();

    return {
      success: true,
      message: 'Emergency Medical Reserve reallocated from Maitri. Stock restored to 24 days buffer.',
      recoveredRisk: this.expedition.overallRiskScore,
    };
  }

  // Inventory
  public getInventory(stationId?: string): InventoryItem[] {
    if (stationId && stationId !== 'all') {
      return this.inventory.filter((i) => i.stationId.toLowerCase() === stationId.toLowerCase());
    }
    return this.inventory;
  }

  // Assets
  public getAssets(): Asset[] {
    return this.assets;
  }

  public getAsset(id: string): Asset | undefined {
    return this.assets.find((a) => a.id.toLowerCase() === id.toLowerCase());
  }

  // Personnel
  public getPersonnel(): Personnel[] {
    return this.personnel;
  }

  public getPersonnelMember(id: string): Personnel | undefined {
    return this.personnel.find((p) => p.id.toLowerCase() === id.toLowerCase());
  }

  // Incidents
  public getIncidents(): Incident[] {
    return this.incidents;
  }

  public createIncident(data: Partial<Incident>): Incident {
    const newId = `INC-0${10 + this.incidents.length + 1}`;
    const nearestStation = data.location?.toLowerCase().includes('maitri') ? 'Maitri Station' : 'Bharati Station';
    const nearestVehicle = nearestStation.includes('Maitri') ? 'PB-04 Snow Vehicle' : 'PB-07 (Rescue Spec PistenBully)';
    const doctor = nearestStation.includes('Maitri') ? 'Dr. Suresh Sen (Maitri Hospital)' : 'Dr. Anita Singh (Bharati Base Lead)';

    const incident: Incident = {
      id: newId,
      type: data.type || 'Vehicle Breakdown',
      title: data.title || `${data.type} Alert at ${data.location || 'Field Zone'}`,
      location: data.location || '20 km from station',
      coordinates: data.coordinates || { lat: -69.45, lng: 76.25 },
      severity: data.severity || 'HIGH',
      peopleAffected: data.peopleAffected ?? 2,
      description: data.description || 'Field emergency reported. Response protocol initiated.',
      status: 'In Progress',
      timestamp: 'Just now',
      responsePlan: {
        nearestStation,
        nearestVehicleId: nearestVehicle,
        nearestPersonnelName: doctor,
        emergencyItems: ['Heated Survival Pod', 'Trauma Kit Alpha', 'Satellite Emergency Beacon', 'Thermal Blankets'],
        etaMinutes: 35,
        steps: [
          `Dispatch ${nearestVehicle} from station base`,
          `Assign ${doctor} to on-board triage team`,
          'Activate satellite tracking channel & VHF emergency link',
          'Deploy field repair & medical stabilization kit',
        ],
      },
    };

    this.incidents.unshift(incident);

    // Also create a linked operational alert
    this.alerts.unshift({
      id: `alt-${Date.now()}`,
      severity: incident.severity,
      title: `Emergency Incident: ${incident.title}`,
      affectedEntity: incident.location,
      source: 'Emergency Response Engine',
      timestamp: 'Just now',
      reason: incident.description,
      impact: `${incident.peopleAffected} personnel affected; dispatch required.`,
      recommendedAction: incident.responsePlan ? incident.responsePlan.steps[0] : 'Dispatch response vehicle immediately.',
      status: 'New',
    });

    this.recalculateAll();
    return incident;
  }

  // Alerts & Actions
  public getAlerts(): Alert[] {
    return this.alerts;
  }

  public updateAlert(id: string, patch: Partial<Alert>): Alert | undefined {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) return undefined;
    Object.assign(alert, patch);
    this.recalculateAll();
    return alert;
  }

  public getActions(): ActionItem[] {
    return this.actions;
  }

  public createAction(actionData: Partial<ActionItem>): ActionItem {
    const action: ActionItem = {
      id: `act-${Date.now().toString().slice(-4)}`,
      alertId: actionData.alertId,
      title: actionData.title || 'Operational Response Action',
      description: actionData.description || 'Command center action dispatch.',
      assignedTo: actionData.assignedTo || 'Station Operations Lead',
      targetStation: actionData.targetStation || 'Bharati Station',
      status: 'In Progress',
      createdAt: 'Just now',
      impactDescription: actionData.impactDescription || 'Risk mitigation action dispatched.',
    };
    this.actions.unshift(action);
    return action;
  }

  // What-If Simulation
  public runWhatIfSimulation(scenario: {
    type: string;
    cargoId?: string;
    delayHours?: number;
    consumptionMultiplier?: number;
    stationId?: string;
  }) {
    const baselineRisk = 38;
    const baselineFuelDays = 22;
    const baselineMedicalDays = 11;

    let simulatedFuelDays = baselineFuelDays;
    let simulatedMedicalDays = baselineMedicalDays;
    let simulatedRisk = baselineRisk;
    let affectedStation = 'Bharati Station';
    let recommendation = 'Maintain standard operating procedures.';

    if (scenario.type === 'cargo-delay') {
      const delay = scenario.delayHours || 48;
      simulatedMedicalDays = delay >= 48 ? 9 : 10;
      simulatedRisk = delay >= 48 ? 69 : 49;
      recommendation = 'Reallocate 150 medical units from Maitri and prioritize shipment MED-024.';
    } else if (scenario.type === 'weather-disruption') {
      simulatedRisk = 62;
      simulatedFuelDays = 18; // Cold surge forces extra heating
      recommendation = 'Consolidate station power into Module A and prepare blizzard tie-downs.';
    } else if (scenario.type === 'vehicle-failure') {
      simulatedRisk = 56;
      recommendation = 'Reroute plateau transport tasks to PB-07 and expedite SP-032 spare parts delivery.';
    } else if (scenario.type === 'inventory-surge') {
      const mult = scenario.consumptionMultiplier || 1.4;
      simulatedFuelDays = Math.round(baselineFuelDays / mult);
      simulatedMedicalDays = Math.round(baselineMedicalDays / mult);
      simulatedRisk = 64;
      recommendation = 'Impose secondary heating rationing and request emergency aerial top-up.';
    } else if (scenario.type === 'shipment-cancellation') {
      simulatedRisk = 82;
      simulatedMedicalDays = 6;
      recommendation = 'Declare critical supply alert; initiate multi-lateral airbridge request via Cape Town.';
    }

    return {
      scenario,
      before: {
        fuelDays: baselineFuelDays,
        medicalDays: baselineMedicalDays,
        risk: baselineRisk,
        stationStatus: 'Operational',
      },
      after: {
        fuelDays: simulatedFuelDays,
        medicalDays: simulatedMedicalDays,
        risk: simulatedRisk,
        affectedStation,
        newRiskLevel: simulatedRisk > 65 ? 'High Risk' : 'Warning',
        recommendedAction: recommendation,
      },
      impactChain: [
        { node: 'Scenario Trigger', desc: `${scenario.type.toUpperCase()} applied` },
        { node: 'Logistics Impact', desc: 'Downstream delivery & supply window constricted' },
        { node: 'Reserve Depletion', desc: `Critical safety reserves drop (Medical: ${simulatedMedicalDays}d, Fuel: ${simulatedFuelDays}d)` },
        { node: 'Station Risk Spike', desc: `${affectedStation} risk escalates to ${simulatedRisk}/100` },
        { node: 'Action Generated', desc: recommendation },
      ],
    };
  }

  // Resource Optimization (Bonus)
  public optimizeCargoAllocation(vehicleId: string): VehicleAllocationPlan {
    const vehicle = this.assets.find((a) => a.id.toLowerCase() === vehicleId.toLowerCase()) || this.assets[0];
    const capacityKg = vehicle.id === 'PB-07' ? 6000 : 4500;

    // Prioritize critical and high-priority cargo destined for Bharati
    const sortedCargo = [...this.cargo]
      .filter((c) => c.destination.toLowerCase().includes('bharati'))
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });

    const assigned: Array<{ id: string; category: string; weightKg: number; priority: any }> = [];
    let currentWeight = 0;

    for (const c of sortedCargo) {
      if (currentWeight + c.weightKg <= capacityKg) {
        assigned.push({
          id: c.id,
          category: c.category,
          weightKg: c.weightKg,
          priority: c.priority,
        });
        currentWeight += c.weightKg;
      }
    }

    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      capacityKg,
      assignedWeightKg: currentWeight,
      utilizationPercentage: Math.round((currentWeight / capacityKg) * 100),
      assignedShipments: assigned,
    };
  }
}

export const stateEngine = new StateEngine();

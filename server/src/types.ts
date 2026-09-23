export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'Critical' | 'High' | 'Medium' | 'Low';
export type OperationalStatus = 'Normal' | 'Warning' | 'High Risk' | 'Critical';

export interface WeatherSnapshot {
  temperature: number;
  windSpeed: number;
  condition: string;
  visibility: string;
  lastUpdated: string;
}

export interface Station {
  id: string;
  name: string;
  region: string;
  coordinates: { lat: number; lng: number };
  weather: WeatherSnapshot;
  status: 'Operational' | 'Warning' | 'High Risk';
  personnelPresent: number;
  inventoryReadiness: number;
  operationalAssets: { operational: number; total: number };
  incomingCargoCount: number;
  openIncidentsCount: number;
  stationRisk: number;
  riskLevel: OperationalStatus;
  image?: string;
}

export interface CargoJourneyStep {
  stage: string;
  location: string;
  date: string;
  status: 'completed' | 'current' | 'upcoming' | 'delayed';
}

export interface CargoShipment {
  id: string;
  category: 'Medical' | 'Food' | 'Fuel' | 'Scientific' | 'Spare Parts' | 'Machinery' | 'Construction' | 'General';
  description: string;
  origin: string;
  destination: string;
  currentLocation: string;
  transportMode: 'Vessel' | 'Air' | 'Snow Vehicle' | 'Warehouse';
  priority: Priority;
  weightKg: number;
  eta: string;
  originalEta?: string;
  status: 'Planned' | 'Packed' | 'At Warehouse' | 'In Transit' | 'At Port' | 'At Sea' | 'At Antarctic Station' | 'Delivered' | 'Delayed' | 'Damaged';
  riskScore: number;
  riskLevel: Priority;
  riskBreakdown: {
    delayImpact: number;
    cargoCriticality: number;
    inventoryDependency: number;
    weatherRisk: number;
  };
  journey: CargoJourneyStep[];
  delayHours: number;
  vesselName?: string;
}

export interface InventoryItem {
  id: string;
  stationId: string;
  category: 'Food' | 'Fuel' | 'Medicine' | 'Spare Parts' | 'Water' | 'Scientific';
  itemName: string;
  currentStock: number;
  unit: string;
  dailyUsage: number;
  predictedUsage: number;
  daysRemaining: number;
  originalDaysRemaining?: number;
  safetyThresholdDays: number;
  nextShipmentEta: string;
  linkedCargoId?: string;
  riskStatus: OperationalStatus;
  consumptionHistory: Array<{ day: string; actual: number; predicted: number }>;
}

export interface Asset {
  id: string;
  name: string;
  type: 'Snow Vehicle' | 'Generator' | 'Crane' | 'Scientific Equipment' | 'Utility Machinery';
  stationId: string;
  status: 'Operational' | 'Maintenance' | 'Critical' | 'Standby';
  engineHours: number;
  lastMaintenanceDate: string;
  healthPercentage: number;
  failureRisk: 'Low' | 'Medium' | 'High';
  nextMaintenanceHours: number;
  diagnosticNotes: string;
  recommendedAction?: string;
}

export interface Personnel {
  id: string;
  name: string;
  role: 'Scientist' | 'Engineer' | 'Doctor' | 'Technician' | 'Logistics' | 'Commander';
  stationId: string;
  currentLocation: string;
  destination?: string;
  status: 'At Station' | 'In Transit' | 'Field Mission' | 'Standby';
  eta?: string;
  emergencyAvailability: 'Available' | 'Active' | 'Standby' | 'En Route';
  coordinates?: { lat: number; lng: number };
}

export interface Incident {
  id: string;
  type: 'Vehicle Breakdown' | 'Medical Emergency' | 'Missing Personnel' | 'Cargo Damage' | 'Communication Failure' | 'Fire / Safety' | 'Other';
  title: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  severity: Priority;
  peopleAffected: number;
  description: string;
  status: 'New' | 'In Progress' | 'Dispatched' | 'Resolved';
  timestamp: string;
  responsePlan?: {
    nearestStation: string;
    nearestVehicleId: string;
    nearestPersonnelName: string;
    emergencyItems: string[];
    etaMinutes: number;
    steps: string[];
  };
}

export interface Alert {
  id: string;
  severity: Priority;
  title: string;
  affectedEntity: string;
  source: string;
  timestamp: string;
  reason: string;
  impact: string;
  recommendedAction: string;
  status: 'New' | 'Acknowledged' | 'In Progress' | 'Resolved';
  actionLinkedId?: string;
}

export interface ActionItem {
  id: string;
  alertId?: string;
  title: string;
  description: string;
  assignedTo: string;
  targetStation: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt: string;
  executedAt?: string;
  impactDescription: string;
}

export interface ExpeditionMilestone {
  id: string;
  date: string;
  title: string;
  status: 'completed' | 'in-progress' | 'upcoming';
}

export interface Expedition {
  id: string;
  code: string;
  title: string;
  status: 'Active' | 'Planning' | 'Completed';
  startDate: string;
  endDate: string;
  stations: string[];
  personnelCount: number;
  totalCargoCount: number;
  activeAlertsCount: number;
  overallRiskScore: number;
  objectives: string[];
  milestones: ExpeditionMilestone[];
}

export interface DashboardSummary {
  expedition: Expedition;
  kpi: {
    personnel: number;
    cargoShipments: number;
    assets: number;
    inventoryReadiness: number;
    activeAlerts: number;
    overallRisk: number;
    riskBreakdown: {
      cargo: number;
      inventory: number;
      assets: number;
      personnel: number;
      weather: number;
    };
  };
  operationalStrip: {
    inventoryRiskItems: number;
    delayedCargoCount: number;
    operationalAssetsCount: string;
    personnelInTransitCount: number;
    stationsSummary: Array<{ name: string; status: string; riskLevel: string }>;
  };
  alerts: Alert[];
  stations: Station[];
}

export interface CargoDelaySimulationRequest {
  delayHours: number;
}

export interface CargoDelaySimulationResponse {
  cargo: CargoShipment;
  impact: {
    stationAffected: string;
    inventoryCategoryAffected: string;
    previousDaysRemaining: number;
    newDaysRemaining: number;
    previousStationRisk: number;
    newStationRisk: number;
    previousOverallRisk: number;
    newOverallRisk: number;
    alertCreated: Alert;
    recommendedAction: string;
    impactChain: Array<{
      step: number;
      title: string;
      description: string;
      status: 'trigger' | 'cascade' | 'breach' | 'alert' | 'recommendation';
    }>;
  };
}

export interface VehicleAllocationPlan {
  vehicleId: string;
  vehicleName: string;
  capacityKg: number;
  assignedWeightKg: number;
  utilizationPercentage: number;
  assignedShipments: Array<{
    id: string;
    category: string;
    weightKg: number;
    priority: Priority;
  }>;
}

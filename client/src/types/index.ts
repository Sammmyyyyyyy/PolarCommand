export type UserRole = 'ADMIN' | 'COMMANDER' | 'LOGISTICS_OFFICER' | 'STATION_MANAGER' | 'VIEWER';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'Critical' | 'High' | 'Medium' | 'Low';
export type OperationalStatus = 'Normal' | 'Warning' | 'High Risk' | 'Critical' | 'Operational';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  stationId?: string | null;
  createdAt: string;
}

export interface WeatherSnapshot {
  id?: string;
  temperature?: number;
  tempCelsius?: number;
  windSpeedKnots?: number;
  windSpeed?: number;
  condition?: string;
  visibility?: string;
  lastUpdated?: string;
  recordedAt?: string;
}

export interface Station {
  id: string;
  expeditionId: string;
  name: string;
  code: string;
  region: string;
  latitude: number;
  longitude: number;
  lat?: number;
  lng?: number;
  coordinates?: { lat: number; lng: number };
  status: 'Operational' | 'Warning' | 'High Risk' | string;
  capacity: number;
  currentRisk: number;
  weather?: any;
  personnelCount?: number;
  personnelPresent?: number;
  inventoryReadiness?: number;
  operationalAssets?: { operational: number; total: number };
  incomingCargoCount?: number;
  openIncidentsCount?: number;
  stationRisk?: number;
  riskLevel?: string;
  image?: string;
}

export interface CargoJourneyStep {
  stage: string;
  location: string;
  date?: string;
  status: 'completed' | 'current' | 'upcoming' | 'delayed';
}

export interface CargoShipment {
  id: string;
  expeditionId: string;
  cargoCode: string;
  description: string;
  category: 'Medical' | 'Food' | 'Fuel' | 'Scientific' | 'Spare Parts' | 'Machinery' | 'Construction' | 'General';
  weightKg: number;
  quantity?: number;
  origin: string;
  destination: string;
  currentLocation: string;
  transportMode: 'Vessel' | 'Air' | 'Snow Vehicle' | 'Warehouse';
  priority: Priority;
  departureDate: string;
  eta: string;
  originalEta?: string;
  delayHours: number;
  specialRequirements?: string;
  status: 'Created' | 'Scheduled' | 'In Transit' | 'Delayed' | 'At Intermediate Location' | 'Arrived' | 'Cancelled' | 'Planned' | 'Packed' | 'At Warehouse' | 'At Port' | 'At Sea' | 'At Antarctic Station' | 'Delivered' | 'Damaged';
  vesselName?: string;
  riskScore: number;
  riskLevel: Priority;
  riskBreakdown?: {
    cargo?: number;
    inventory?: number;
    weather?: number;
    asset?: number;
    personnel?: number;
    delayImpact?: number;
    cargoCriticality?: number;
    inventoryDependency?: number;
    [key: string]: any;
  };
  journeyJson?: string;
  journey?: CargoJourneyStep[];
  linkedInventory?: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  expeditionId: string;
  stationId: string;
  station?: Station;
  category: 'Medicine' | 'Medical' | 'Food' | 'Fuel' | 'Spare Parts' | 'Water' | 'Scientific';
  itemName: string;
  name?: string;
  currentStock: number;
  unit: string;
  dailyUsage: number;
  safetyThresholdDays: number;
  expiryDate?: string;
  replenishmentEta?: string;
  linkedCargoId?: string;
  linkedCargo?: CargoShipment;
  riskStatus: 'Normal' | 'Warning' | 'High Risk' | 'Critical';
  daysOfSupply?: number;
  daysRemaining?: number;
  stockoutDate?: string;
}

export interface Asset {
  id: string;
  expeditionId: string;
  assetCode?: string;
  name: string;
  type: 'Snow Vehicle' | 'Generator' | 'Crane' | 'Scientific Equipment' | 'Utility Machinery' | string;
  stationId: string;
  station?: Station;
  currentCondition?: 'Good' | 'Fair' | 'Degraded' | 'Critical';
  operatingHours: number;
  maintenanceInterval: number;
  lastMaintenanceDate?: string;
  healthPercentage?: number;
  healthScore?: number;
  fuelConsumptionPerHour?: number;
  failureRisk?: 'Low' | 'Medium' | 'High';
  status: 'Operational' | 'Maintenance' | 'Critical' | 'Standby' | 'Unavailable' | string;
  diagnosticNotes?: string;
  remainingHours?: number;
  maintenanceStatus?: string;
}

export interface Personnel {
  id: string;
  expeditionId: string;
  memberId?: string;
  name: string;
  role: 'Scientist' | 'Engineer' | 'Doctor' | 'Technician' | 'Logistics' | 'Commander' | string;
  qualification?: string;
  specialization?: string;
  bloodType?: string;
  medicalClearance?: string;
  currentLocation: string;
  assignedStationId?: string | null;
  stationId?: string;
  assignedStation?: Station;
  station?: Station;
  emergencyAvailability?: 'Available' | 'Active' | 'Standby' | 'En Route';
  contactInfo?: string;
  movementSchedule?: string;
  status: 'At Station' | 'In Transit' | 'Field Mission' | 'Standby' | 'On Base' | string;
  latitude?: number;
  longitude?: number;
}

export interface Movement {
  id: string;
  expeditionId: string;
  fromLocation?: string;
  toLocation?: string;
  originStation?: string;
  destStation?: string;
  title?: string;
  type?: string;
  departureTime?: string;
  departureDate?: string;
  eta?: string;
  arrivalDate?: string;
  actualArrival?: string;
  transportMode?: 'Vessel' | 'Air' | 'Snow Vehicle' | 'Foot' | string;
  vesselName?: string;
  flightNumber?: string;
  vehicleId?: string;
  status: 'Scheduled' | 'Departed' | 'In Transit' | 'Arrived' | 'Delayed' | 'Cancelled' | 'Planned' | 'Completed' | string;
  currentLat?: number;
  currentLng?: number;
  notes?: string;
  personnelRoster?: Array<{ id: string; personnel: Personnel }>;
  cargoManifest?: Array<{ id: string; cargo: CargoShipment }>;
}

export interface Incident {
  id: string;
  expeditionId: string;
  incidentCode?: string;
  type: 'Vehicle Breakdown' | 'Medical Emergency' | 'Missing Personnel' | 'Cargo Damage' | 'Communication Failure' | 'Fire / Safety' | 'Other' | string;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  severity: Priority;
  peopleAffected: number;
  description: string;
  requiredSupport?: string;
  status: 'New' | 'In Progress' | 'Dispatched' | 'Resolved' | string;
  targetStationId?: string;
  targetStation?: Station;
  assignedPersonnelId?: string;
  assignedPersonnel?: Personnel;
  assignedAssetId?: string;
  assignedAsset?: Asset;
  responsePlanJson?: string;
  responsePlan?: {
    nearestStationName?: string;
    nearestStation?: string;
    nearestVehicleName?: string;
    nearestVehicleId?: string;
    nearestPersonnelName?: string;
    etaMinutes: number;
    recommendedSteps?: string[];
    steps?: string[];
    emergencyItems?: string[];
  };
  timestamp?: string;
  createdAt?: string;
}

export interface Alert {
  id: string;
  expeditionId: string;
  severity: Priority;
  title: string;
  source?: string;
  affectedEntity: string;
  reason?: string;
  impact: string;
  recommendedAction: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED' | 'New' | 'Acknowledged' | 'In Progress' | 'Resolved';
  actions?: ActionItem[];
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
}

export interface ActionItem {
  id: string;
  expeditionId: string;
  alertId?: string;
  alert?: Alert;
  actionType?: string;
  title: string;
  description: string;
  assignedTo: string;
  targetStationId?: string;
  targetStation?: Station;
  impactDescription?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | string;
  createdAt?: string;
  executedAt?: string;
  executionPayloadJson?: string;
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
  name?: string;
  type: string;
  missionObjective?: string;
  commanderId?: string | null;
  commander?: User | null;
  commanderName?: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'Active' | 'Planning' | 'Completed';
  startDate: string;
  endDate: string;
  origin: string;
  destination: string;
  intermediateHubs?: string;
  transportModes?: string;
  priority: string;
  notes?: string;
  overallRiskScore: number;
  stations?: Station[];
  personnel?: Personnel[];
  cargo?: CargoShipment[];
  inventory?: InventoryItem[];
  assets?: Asset[];
  _count?: {
    personnel: number;
    cargo: number;
    inventory: number;
    assets: number;
    incidents: number;
    alerts: number;
    movements?: number;
  };
  objectives?: string[];
  milestones?: ExpeditionMilestone[];
  personnelCount?: number;
  totalCargoCount?: number;
  activeAlertsCount?: number;
}

export interface DashboardSummary {
  expedition: Expedition;
  kpi: {
    personnel: number;
    personnelInTransit?: number;
    cargoShipments: number;
    delayedCargoCount?: number;
    inTransitCargoCount?: number;
    assets: number;
    operationalAssetsCount?: number | string;
    maintenanceDueAssetsCount?: number;
    inventoryReadiness: number;
    inventoryItemsAtRisk?: number;
    activeAlerts: number;
    overallRisk: number;
    riskLevel?: string;
    riskBreakdown?: {
      cargo: number;
      inventory: number;
      assets: number;
      personnel: number;
      incidents?: number;
      weather: number;
      total?: number;
    };
    contributingFactors?: string[];
    recommendedMitigation?: string;
  };
  stationsSummary: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    currentRisk: number;
    riskLevel?: string;
    weather?: WeatherSnapshot;
  }>;
  operationalStrip?: {
    inventoryRiskItems: number;
    delayedCargoCount: number;
    operationalAssetsCount: string;
    personnelInTransitCount: number;
    stationsSummary: Array<{ name: string; status: string; riskLevel: string }>;
  };
  alerts: Alert[];
  stations?: Station[];
  recentActivity?: AuditLog[];
}

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

export interface RiskSnapshot {
  id: string;
  expeditionId: string;
  stationId?: string;
  totalScore: number;
  cargoRisk: number;
  inventoryRisk: number;
  assetRisk: number;
  personnelRisk: number;
  incidentRisk: number;
  weatherRisk: number;
  contributingFactors?: string;
  recordedAt: string;
  snapshotAt?: string;
  breakdown?: {
    cargo?: number;
    inventory?: number;
    asset?: number;
    personnel?: number;
    incident?: number;
    weather?: number;
  };
}

export interface AuditLog {
  id: string;
  expeditionId?: string;
  userId?: string;
  user?: User;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  previousStateJson?: string;
  newStateJson?: string;
  reason?: string;
  timestamp: string;
  actorName?: string;
  entityType?: string;
  details?: string;
}

export interface CargoDelaySimulationResponse {
  cargo: CargoShipment;
  impact: {
    stationAffected: string;
    inventoryCategoryAffected: string;
    previousDaysRemaining: number;
    newDaysRemaining: number;
    previousStationRisk?: number;
    newStationRisk?: number;
    previousOverallRisk: number;
    newOverallRisk: number;
    riskLevel?: string;
    alertCreated?: Alert;
    recommendedAction: string;
    impactChain: Array<{
      step: number;
      title: string;
      description: string;
      status: string;
    }>;
  };
  alerts?: Alert[];
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

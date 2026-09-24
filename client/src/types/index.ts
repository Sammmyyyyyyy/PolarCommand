export type UserRole = 'ADMIN' | 'COMMANDER' | 'LOGISTICS_OFFICER' | 'STATION_MANAGER' | 'FIELD_MEMBER' | 'VIEWER';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'Critical' | 'High' | 'Medium' | 'Low';
export type OperationalStatus = 'Normal' | 'Warning' | 'High Risk' | 'Critical' | 'Operational';
export type ExpeditionLifecycle = 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type TaskStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type CheckInStatus = 'ACTIVE' | 'RESTING' | 'IN_TRANSIT' | 'ON_TASK' | 'MEDICAL' | 'MISSING' | 'EMERGENCY';
export type ConnectivityStatus = 'ONLINE' | 'WEAK CONNECTION' | 'OFFLINE' | 'SYNCING';

export interface Organization {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    expeditions?: number;
    users?: number;
    stations?: number;
    assets?: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  stationId?: string | null;
  organizationId?: string | null;
  organization?: Organization;
  assignedPersonnelId?: string | null;
  assignedPersonnel?: Personnel;
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

export interface WeatherConditionReport {
  isSimulated: boolean;
  providerLabel: string;
  stationId: string;
  stationName: string;
  temperature: number;
  windSpeedKnots: number;
  condition: string;
  visibility: string;
  windChillCelsius: number;
  iceSurfaceFriction: 'Good' | 'Moderate' | 'Severe Glaze' | 'Roughed Ice';
  travelFeasibility: 'OPEN' | 'CAUTION' | 'RESTRICTED' | 'PROHIBITED';
  recordedAt: string;
}

export interface Station {
  id: string;
  expeditionId: string;
  organizationId?: string;
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
  connectivityStatus?: string;
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
  status: 'PLANNED' | 'PACKED' | 'LOADED' | 'IN_TRANSIT' | 'AT_HUB' | 'AT_STATION' | 'DELIVERED' | 'DELAYED' | 'DAMAGED' | 'LOST' | 'CANCELLED' | 'Created' | 'Scheduled' | 'In Transit' | 'Delayed' | 'At Intermediate Location' | 'Arrived' | 'Cancelled' | 'Delivered' | 'Damaged';
  vesselName?: string;
  receivedAt?: string;
  receivedBy?: string;
  receivedQuantity?: number;
  receivingNotes?: string;
  conditionOnArrival?: string;
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
  organizationId?: string;
  assetCode?: string;
  name: string;
  type: 'Snow Vehicle' | 'Generator' | 'Crane' | 'Scientific Equipment' | 'Utility Machinery' | string;
  stationId: string;
  station?: Station;
  currentCondition?: 'Good' | 'Fair' | 'Degraded' | 'Critical';
  operatingHours: number;
  maintenanceInterval: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  healthPercentage?: number;
  healthScore?: number;
  fuelConsumptionPerHour?: number;
  failureRisk?: 'Low' | 'Medium' | 'High';
  status: 'Operational' | 'Maintenance' | 'Critical' | 'Standby' | 'Unavailable' | string;
  lifecycleStatus?: 'AVAILABLE' | 'ASSIGNED' | 'IN_USE' | 'INSPECTION_DUE' | 'MAINTENANCE_DUE' | 'UNDER_MAINTENANCE' | 'FAILED' | 'RETIRED';
  diagnosticNotes?: string;
  remainingHours?: number;
  maintenanceStatus?: string;
}

export interface CheckInLog {
  id: string;
  personnelId: string;
  expeditionId: string;
  status: CheckInStatus;
  stationName?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  timestamp: string;
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
  checkInStatus?: CheckInStatus;
  lastCheckIn?: string;
  expectedNextCheckIn?: string;
  isCheckInOverdue?: boolean;
  checkInNotes?: string;
  latitude?: number;
  longitude?: number;
  checkInLogs?: CheckInLog[];
}

export interface Task {
  id: string;
  expeditionId: string;
  title: string;
  description: string;
  stationId?: string | null;
  station?: Station;
  location?: string;
  assignedPersonnelId?: string | null;
  assignedPersonnel?: Personnel;
  assignedUserId?: string | null;
  assignedUser?: User;
  priority: Priority;
  status: TaskStatus;
  startTime?: string;
  dueTime?: string;
  completionTime?: string;
  dependencies?: string;
  requiredAssetId?: string | null;
  requiredAsset?: Asset;
  requiredCargo?: string;
  notes?: string;
  fieldObservations?: string;
  createdAt: string;
  updatedAt: string;
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
  movementCode?: string;
  route?: string;
  plannedDeparture?: string;
  plannedEta?: string;
  actualDeparture?: string;
  assignedAssetId?: string;
  delayHours?: number;
  weatherConstraint?: string;
  riskScore?: number;
  riskLevel?: string;
  notes?: string;
  personnelRoster?: Array<{ id: string; personnel: Personnel }>;
  cargoManifest?: Array<{ id: string; cargo: CargoShipment }>;
}

export interface Incident {
  id: string;
  expeditionId: string;
  incidentCode?: string;
  type: 'Vehicle Breakdown' | 'Medical Emergency' | 'Missing Personnel' | 'Cargo Damage' | 'Communication Failure' | 'Fire / Safety' | 'SOS Beacon' | 'Other' | string;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  severity: Priority;
  peopleAffected: number;
  description: string;
  requiredSupport?: string;
  status: 'New' | 'In Progress' | 'Dispatched' | 'Resolved' | string;
  isSosEmergency?: boolean;
  reporterUserId?: string;
  reporterName?: string;
  targetStationId?: string;
  targetStation?: Station;
  assignedPersonnelId?: string;
  assignedPersonnel?: Personnel;
  assignedAssetId?: string;
  assignedAsset?: Asset;
  responseEtaMinutes?: number;
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
  resolutionNotes?: string;
  resolvedAt?: string;
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
  organizationId?: string | null;
  organization?: Organization;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'Active' | 'Planning' | 'Completed';
  lifecycleStatus?: ExpeditionLifecycle;
  connectivityStatus?: string;
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
  tasks?: Task[];
  _count?: {
    personnel: number;
    cargo: number;
    inventory: number;
    assets: number;
    tasks?: number;
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
    overdueCheckIns?: number;
    cargoShipments: number;
    delayedCargoCount?: number;
    inTransitCargoCount?: number;
    deliveredCargoCount?: number;
    assets: number;
    operationalAssetsCount?: number | string;
    maintenanceDueAssetsCount?: number;
    failedAssetsCount?: number;
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
      tasks?: number;
      checkIns?: number;
      total?: number;
    };
    contributingFactors?: string[];
    recommendedMitigation?: string;
    tasks?: {
      total: number;
      pending: number;
      active: number;
      blocked: number;
      completed: number;
    };
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
  type: 'INVENTORY_REALLOCATION' | 'EXPEDITE_CARGO' | 'MAINTENANCE_OVERHAUL' | 'EMERGENCY_DISPATCH' | 'WEATHER_SHELTER' | 'TASK_RESOLUTION';
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
    taskId?: string;
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
  taskRisk?: number;
  checkInRisk?: number;
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
    tasks?: number;
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

export interface PersonnelAccountabilitySummary {
  summary: {
    total: number;
    active: number;
    resting: number;
    inTransit: number;
    onTask: number;
    medical: number;
    overdue: number;
    emergency: number;
    accountabilityRate: number;
  };
  personnel: Personnel[];
}

export interface CargoDelaySimulationResponse {
  cargo: CargoShipment;
  delayHours: number;
  impact: {
    delayedCargoId: string;
    affectedStation: string;
    affectedItem: string;
    previousDaysRemaining: number;
    newDaysRemaining: number;
    previousStationRisk: number;
    newStationRisk: number;
    riskSurge: number;
    alertCreated: boolean;
    alertId?: string;
    recommendedAction: string;
  };
}

export interface VehicleAllocationPlan {
  vehicleId: string;
  vehicleName: string;
  capacityKg: number;
  totalAllocatedWeightKg: number;
  assignedWeightKg?: number;
  utilizationPercentage: number;
  status: string;
  assignedShipments: Array<{
    id: string;
    category: string;
    weightKg: number;
    priority: string;
    reason: string;
  }>;
  fuelEfficiencyScore?: number;
  routeRecommendation?: string;
}

export interface WeatherConditionReport {
  isSimulated: boolean;
  provider: string;
  providerLabel: string;
  status: 'LIVE' | 'STALE' | 'UNAVAILABLE';
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  windSpeedKnots: number;
  windDirection: number;
  windGustKnots: number;
  visibility: string;
  visibilityMeters: number;
  precipitationMm: number;
  snowfallCm: number;
  snowDepthMeters: number;
  weatherCode: number;
  condition: string;
  cloudCoverPercent: number;
  windChillCelsius: number;
  iceSurfaceFriction: 'Good' | 'Moderate' | 'Severe Glaze' | 'Roughed Ice';
  travelFeasibility: 'OPEN' | 'CAUTION' | 'RESTRICTED' | 'PROHIBITED';
  movementRiskMultiplier: number;
  advisoryNote: string;
  lastUpdated: string;
  fetchedAt: string;
  isStale: boolean;
}

export type ObservationCategory =
  | 'ENVIRONMENT'
  | 'EQUIPMENT'
  | 'SAFETY'
  | 'CARGO'
  | 'INFRASTRUCTURE'
  | 'PERSONNEL'
  | 'ROUTE'
  | 'OTHER';

export type ObservationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FieldObservation {
  id: string;
  expeditionId: string;
  stationId?: string;
  station?: Station;
  location?: string;
  submittedById?: string;
  submittedBy?: { id: string; name: string; role: string; email: string };
  submitterName: string;
  category: ObservationCategory;
  description: string;
  severity: ObservationSeverity;
  relatedTaskId?: string;
  relatedTask?: Task;
  relatedAssetId?: string;
  relatedAsset?: Asset;
  linkedIncidentId?: string;
  linkedAlertId?: string;
  timestamp: string;
  createdAt: string;
}

export interface OperationalDocument {
  id: string;
  expeditionId: string;
  entityType: 'EXPEDITION' | 'TASK' | 'INCIDENT' | 'CARGO' | 'ASSET' | 'STATION' | 'FIELD_OBSERVATION' | 'MOVEMENT';
  entityId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  uploadedById?: string;
  uploadedByName: string;
  timestamp: string;
}

export interface ReadinessDetail {
  passed: boolean;
  message: string;
  [key: string]: any;
}

export interface ExpeditionReadinessResult {
  isReady: boolean;
  status: 'READY' | 'NOT READY';
  overallScore: number;
  blockingIssues: string[];
  warnings: string[];
  details: {
    command: ReadinessDetail;
    personnel: ReadinessDetail;
    stations: ReadinessDetail;
    assets: ReadinessDetail;
    cargo: ReadinessDetail;
    inventory: ReadinessDetail;
    tasks: ReadinessDetail;
    emergency: ReadinessDetail;
  };
}

export interface OrganizationOverview {
  organization: {
    id: string;
    code: string;
    name: string;
    description?: string;
    totalUsers: number;
  };
  users: User[];
  expeditionsSummary: Array<{
    id: string;
    code: string;
    title: string;
    status: string;
    lifecycleStatus: string;
    overallRiskScore: number;
    commanderName: string;
    crewCount: number;
    stationCount: number;
    assetCount: number;
    cargoCount: number;
    taskCount: number;
    startDate: string;
    endDate: string;
  }>;
  personnelPool: {
    total: number;
    available: number;
    deployed: number;
    overdueCheckIns: number;
    personnelInDistress: number;
    personnel?: any[];
    members: Array<{
      id: string;
      name: string;
      role: string;
      qualification: string;
      status: string;
      checkInStatus: string;
      isCheckInOverdue: boolean;
      currentLocation: string;
      assignedExpedition: string;
      expeditionLifecycle: string;
    }>;
  };
  assetPool: {
    total: number;
    available: number;
    inUse: number;
    maintenanceDue: number;
    failed: number;
    assets: Array<{
      id: string;
      assetCode: string;
      name: string;
      type: string;
      lifecycleStatus: string;
      status: string;
      stationName: string;
      operatingHours: number;
      maintenanceInterval: number;
      assignedExpedition: string;
    }>;
  };
  recentAuditLogs?: AuditLog[];
  auditLogs?: AuditLog[];
}


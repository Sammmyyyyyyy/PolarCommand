import {
  DashboardSummary,
  Expedition,
  Station,
  CargoShipment,
  InventoryItem,
  Asset,
  Personnel,
  Incident,
  Alert,
  ActionItem,
  CargoDelaySimulationResponse,
  OperationalRecommendation,
  RiskSnapshot,
  AuditLog,
  Movement,
  User,
  Organization,
  Task,
  CheckInLog,
  PersonnelAccountabilitySummary,
  WeatherConditionReport,
  FieldObservation,
  OperationalDocument,
  ExpeditionReadinessResult,
  OrganizationOverview,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('polar_auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// -------------------------------------------------------------
// Authentication
// -------------------------------------------------------------
export async function loginUser(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to authenticate');
  }
  const data = await res.json();
  localStorage.setItem('polar_auth_token', data.token);
  return data;
}

export async function fetchCurrentUser(): Promise<{ user: User } | null> {
  const token = localStorage.getItem('polar_auth_token');
  if (!token) return null;
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAllUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load user roster');
  return res.json();
}

// -------------------------------------------------------------
// Expeditions
// -------------------------------------------------------------
export async function fetchExpeditions(): Promise<Expedition[]> {
  const res = await fetch(`${API_BASE}/expeditions`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch expeditions');
  return res.json();
}

export async function fetchExpedition(idOrCode: string): Promise<Expedition> {
  const res = await fetch(`${API_BASE}/expeditions/${idOrCode}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch expedition detail');
  return res.json();
}

export async function createExpedition(data: any): Promise<Expedition> {
  const res = await fetch(`${API_BASE}/expeditions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create expedition');
  }
  return res.json();
}

export async function updateExpedition(id: string, data: any): Promise<Expedition> {
  const res = await fetch(`${API_BASE}/expeditions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update expedition');
  return res.json();
}

export async function deleteExpedition(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/expeditions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete expedition');
  return res.json();
}

export async function reseedDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/seed-demo`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to reseed demo data');
  return res.json();
}

// -------------------------------------------------------------
// Dashboard Summary
// -------------------------------------------------------------
export async function fetchDashboard(expeditionId?: string): Promise<DashboardSummary> {
  const url = expeditionId ? `${API_BASE}/expeditions/${expeditionId}/dashboard` : `${API_BASE}/dashboard`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch dashboard summary');
  return res.json();
}

// -------------------------------------------------------------
// Stations
// -------------------------------------------------------------
export async function fetchStations(expeditionId: string): Promise<Station[]> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/stations`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch stations');
  return res.json();
}

export async function createStation(expeditionId: string, data: any): Promise<Station> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/stations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create station');
  return res.json();
}

// -------------------------------------------------------------
// Cargo
// -------------------------------------------------------------
export async function fetchCargo(expeditionId: string, category?: string, status?: string): Promise<CargoShipment[]> {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (status && status !== 'All') params.append('status', status);
  const url = `${API_BASE}/expeditions/${expeditionId}/cargo?${params.toString()}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch cargo manifest');
  return res.json();
}

export async function fetchCargoItem(expeditionId: string, cargoId: string): Promise<CargoShipment> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/cargo/${cargoId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch cargo item ${cargoId}`);
  return res.json();
}

export async function createCargo(expeditionId: string, data: any): Promise<CargoShipment> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/cargo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create cargo consignment');
  return res.json();
}

export async function updateCargo(expeditionId: string, cargoId: string, data: any): Promise<CargoShipment> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/cargo/${cargoId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update cargo');
  return res.json();
}

export async function deleteCargo(expeditionId: string, cargoId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/cargo/${cargoId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete cargo');
  return res.json();
}

export async function simulateCargoDelay(
  expeditionIdOrCargoId: string,
  cargoIdOrDelayHours: string | number,
  maybeDelayHours?: number
): Promise<CargoDelaySimulationResponse> {
  let url = '';
  let delayHours = 48;
  if (typeof cargoIdOrDelayHours === 'number') {
    url = `${API_BASE}/cargo/${expeditionIdOrCargoId}/simulate-delay`;
    delayHours = cargoIdOrDelayHours;
  } else {
    url = `${API_BASE}/expeditions/${expeditionIdOrCargoId}/cargo/${cargoIdOrDelayHours}/simulate-delay`;
    delayHours = maybeDelayHours ?? 48;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ delayHours }),
  });
  if (!res.ok) throw new Error('Failed to run cargo delay simulation');
  return res.json();
}

// -------------------------------------------------------------
// Inventory
// -------------------------------------------------------------
export async function fetchInventory(expeditionId: string, stationId?: string, category?: string): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (stationId && stationId !== 'all') params.append('station', stationId);
  if (category && category !== 'All') params.append('category', category);
  const url = `${API_BASE}/expeditions/${expeditionId}/inventory?${params.toString()}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function createInventoryItem(expeditionId: string, data: any): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/inventory`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create inventory item');
  return res.json();
}

export const createInventory = createInventoryItem;

export async function reallocateInventory(expeditionId: string, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/inventory/reallocate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to reallocate stock');
  return res.json();
}

export async function updateInventoryItem(expeditionId: string, id: string, data: any): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/inventory/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update inventory item');
  return res.json();
}

export async function deleteInventoryItem(expeditionId: string, id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/inventory/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete inventory item');
  return res.json();
}

// -------------------------------------------------------------
// Assets
// -------------------------------------------------------------
export async function fetchAssets(expeditionId: string, type?: string, stationId?: string): Promise<Asset[]> {
  const params = new URLSearchParams();
  if (type && type !== 'All') params.append('type', type);
  if (stationId && stationId !== 'All') params.append('station', stationId);
  const url = `${API_BASE}/expeditions/${expeditionId}/assets?${params.toString()}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function createAsset(expeditionId: string, data: any): Promise<Asset> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/assets`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create asset');
  return res.json();
}

export async function updateAsset(expeditionId: string, id: string, data: any): Promise<Asset> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/assets/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update asset');
  return res.json();
}

export async function deleteAsset(expeditionId: string, id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/assets/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete asset');
  return res.json();
}

export async function recordAssetMaintenance(expeditionId: string, id: string): Promise<Asset> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/assets/${id}/maintenance`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to record asset maintenance');
  return res.json();
}

// -------------------------------------------------------------
// Personnel
// -------------------------------------------------------------
export async function fetchPersonnel(expeditionId: string, role?: string, status?: string): Promise<Personnel[]> {
  const params = new URLSearchParams();
  if (role && role !== 'All') params.append('role', role);
  if (status && status !== 'All') params.append('status', status);
  const url = `${API_BASE}/expeditions/${expeditionId}/personnel?${params.toString()}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch personnel');
  return res.json();
}

export async function createPersonnel(expeditionId: string, data: any): Promise<Personnel> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/personnel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add personnel');
  return res.json();
}

export async function updatePersonnel(expeditionId: string, id: string, data: any): Promise<Personnel> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/personnel/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update personnel');
  return res.json();
}

export async function deletePersonnel(expeditionId: string, id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/personnel/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete personnel');
  return res.json();
}

// -------------------------------------------------------------
// Movements
// -------------------------------------------------------------
export async function fetchMovements(expeditionId: string, status?: string): Promise<Movement[]> {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  const url = `${API_BASE}/expeditions/${expeditionId}/movements?${params.toString()}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch transit movements');
  return res.json();
}

export async function createMovement(expeditionId: string, data: any): Promise<Movement> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/movements`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to log transit movement');
  return res.json();
}

export async function updateMovementStatus(expeditionId: string, id: string, status: string): Promise<Movement> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/movements/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update movement status');
  return res.json();
}

export async function updateMovement(expeditionId: string, id: string, data: any): Promise<Movement> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/movements/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update movement');
  return res.json();
}

// -------------------------------------------------------------
// Incidents & Emergency Response
// -------------------------------------------------------------
export async function fetchIncidents(expeditionId: string, status?: string): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  const url = `${API_BASE}/expeditions/${expeditionId}/incidents?${params.toString()}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function createIncident(expeditionId: string, data: any): Promise<Incident> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/incidents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create incident');
  return res.json();
}

export async function updateIncident(expeditionId: string, id: string, data: any): Promise<Incident> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/incidents/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update incident');
  return res.json();
}

export async function dispatchIncidentResponse(expeditionId: string, id: string, _payload?: any): Promise<Incident> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/incidents/${id}/dispatch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: _payload ? JSON.stringify(_payload) : undefined,
  });
  if (!res.ok) throw new Error('Failed to dispatch emergency response');
  return res.json();
}

// -------------------------------------------------------------
// Alerts
// -------------------------------------------------------------
export async function fetchAlerts(expeditionId: string): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/alerts`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function updateAlertStatus(expeditionId: string, id: string, status: string): Promise<Alert> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/alerts/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update alert');
  return res.json();
}

export async function acknowledgeAlert(expeditionId: string, id: string): Promise<Alert> {
  return updateAlertStatus(expeditionId, id, 'ACKNOWLEDGED');
}

export async function resolveAlert(expeditionId: string, id: string): Promise<Alert> {
  return updateAlertStatus(expeditionId, id, 'RESOLVED');
}

export async function dismissAlert(expeditionId: string, id: string): Promise<Alert> {
  return updateAlertStatus(expeditionId, id, 'DISMISSED');
}

// -------------------------------------------------------------
// Recommendations & Action Execution
// -------------------------------------------------------------
export async function fetchRecommendations(expeditionId: string): Promise<OperationalRecommendation[]> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/recommendations`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load operational recommendations');
  return res.json();
}

export async function executeAction(expeditionId: string, payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/actions/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to execute mitigation action');
  }
  return res.json();
}

export async function executeHeroAction(): Promise<any> {
  const res = await fetch(`${API_BASE}/demo/execute-action`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to execute hero action');
  return res.json();
}

export async function resetDemoState(): Promise<any> {
  const res = await fetch(`${API_BASE}/demo/reset`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to reset demo state');
  return res.json();
}

export async function fetchActions(expeditionId: string): Promise<ActionItem[]> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/actions`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch action history');
  return res.json();
}

// -------------------------------------------------------------
// What-If Simulations
// -------------------------------------------------------------
export async function runWhatIfSimulation(expeditionId: string, scenario: any): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/simulations/run`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(scenario),
  });
  if (!res.ok) throw new Error('Failed to run simulation');
  return res.json();
}

export const runSimulation = runWhatIfSimulation;

export async function applySimulationScenario(expeditionId: string, simId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/simulations/${simId}/apply`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to apply simulation');
  return res.json();
}

export const applySimulation = applySimulationScenario;

export async function optimizeCargoAllocation(_expeditionId?: string, _params?: any): Promise<any> {
  return {
    optimizedRoutes: [],
    costSavingsPercent: 18.5,
    riskReductionScore: 14,
    projectedDeliverySuccessRate: 98.2,
  };
}

export async function discardSimulationScenario(expeditionId: string, simId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/simulations/${simId}/discard`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to discard simulation');
  return res.json();
}

// -------------------------------------------------------------
// Analytics Telemetry & Audit Logs
// -------------------------------------------------------------
export async function fetchRiskHistory(expeditionId: string, limit: number = 30): Promise<RiskSnapshot[]> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/risk-history?limit=${limit}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch risk history');
  return res.json();
}

export async function fetchAuditLogs(expeditionId: string): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/audit-logs`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch audit activity');
  return res.json();
}

// -------------------------------------------------------------
// Organizations
// -------------------------------------------------------------
export async function fetchOrganizations(): Promise<Organization[]> {
  const res = await fetch(`${API_BASE}/organizations`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch organizations');
  return res.json();
}

export async function fetchOrganization(id: string): Promise<Organization> {
  const res = await fetch(`${API_BASE}/organizations/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch organization details');
  return res.json();
}

export async function createOrganization(data: any): Promise<Organization> {
  const res = await fetch(`${API_BASE}/organizations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create organization');
  return res.json();
}

// -------------------------------------------------------------
// Expedition Lifecycle & Publish
// -------------------------------------------------------------
export async function publishExpedition(expeditionId: string): Promise<Expedition> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/publish`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to publish expedition');
  }
  return res.json();
}

export async function updateExpeditionLifecycle(expeditionId: string, lifecycleStatus: string): Promise<Expedition> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/lifecycle`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ lifecycleStatus }),
  });
  if (!res.ok) throw new Error('Failed to update expedition lifecycle');
  return res.json();
}

// -------------------------------------------------------------
// Tasks & Mission Operations
// -------------------------------------------------------------
export async function fetchTasks(
  expeditionId: string,
  filter?: { status?: string; priority?: string; personnelId?: string; stationId?: string }
): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  if (filter?.priority) params.set('priority', filter.priority);
  if (filter?.personnelId) params.set('personnelId', filter.personnelId);
  if (filter?.stationId) params.set('stationId', filter.stationId);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/tasks${qs}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch operational tasks');
  return res.json();
}

export async function fetchTaskById(expeditionId: string, taskId: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/tasks/${taskId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch task');
  return res.json();
}

export async function createTask(expeditionId: string, data: any): Promise<Task> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create mission task');
  return res.json();
}

export async function updateTask(expeditionId: string, taskId: string, data: any): Promise<Task> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export async function updateTaskStatus(
  expeditionId: string,
  taskId: string,
  status: string,
  options?: { notes?: string; fieldObservations?: string }
): Promise<Task> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, ...options }),
  });
  if (!res.ok) throw new Error('Failed to update task status');
  return res.json();
}

// -------------------------------------------------------------
// Check-In & Personnel Accountability
// -------------------------------------------------------------
export async function recordCheckIn(
  expeditionId: string,
  personnelId: string,
  data: {
    status: string;
    location?: string;
    stationName?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }
): Promise<{ log: CheckInLog; nextCheckIn: string }> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/personnel/${personnelId}/check-in`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to record check-in');
  return res.json();
}

export async function fetchPersonnelAccountability(expeditionId: string): Promise<PersonnelAccountabilitySummary> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/personnel-accountability`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load personnel accountability');
  return res.json();
}

// -------------------------------------------------------------
// Cargo Receiving at Station
// -------------------------------------------------------------
export async function receiveCargo(
  expeditionId: string,
  cargoId: string,
  payload: {
    receivedQuantity?: number;
    conditionOnArrival?: string;
    receivingNotes?: string;
  }
): Promise<{ cargo: CargoShipment; inventory: InventoryItem }> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/cargo/${cargoId}/receive`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to mark cargo received');
  return res.json();
}

// -------------------------------------------------------------
// Emergency SOS & Incident Resolution
// -------------------------------------------------------------
export async function triggerEmergencySos(
  expeditionId: string,
  data: { message?: string; location?: string; latitude?: number; longitude?: number }
): Promise<Incident> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/emergency/sos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to transmit emergency SOS beacon');
  return res.json();
}

export async function resolveIncident(
  expeditionId: string,
  incId: string,
  payload?: { resolutionNotes?: string }
): Promise<Incident> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/incidents/${incId}/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) throw new Error('Failed to resolve incident');
  return res.json();
}

// -------------------------------------------------------------
// Weather Telemetry (Open-Meteo Integration with Cache / Force Refresh)
// -------------------------------------------------------------
export async function fetchStationWeather(
  expeditionId: string,
  stationId: string,
  refresh = false
): Promise<WeatherConditionReport> {
  const url = `${API_BASE}/expeditions/${expeditionId}/stations/${stationId}/weather${refresh ? '?refresh=true' : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch station weather telemetry');
  return res.json();
}

// -------------------------------------------------------------
// Operational Readiness & Lifecycle
// -------------------------------------------------------------
export async function fetchExpeditionReadiness(expeditionId: string): Promise<ExpeditionReadinessResult> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/readiness`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to evaluate expedition operational readiness');
  return res.json();
}

// -------------------------------------------------------------
// Movement Weather Constraint Application
// -------------------------------------------------------------
export async function applyMovementWeatherConstraint(
  expeditionId: string,
  movementId: string,
  stationId: string
): Promise<Movement> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/movements/${movementId}/weather-constraint`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ stationId }),
  });
  if (!res.ok) throw new Error('Failed to apply weather constraint to movement');
  return res.json();
}

// -------------------------------------------------------------
// Field Observations
// -------------------------------------------------------------
export async function fetchFieldObservations(
  expeditionId: string,
  category?: string,
  severity?: string
): Promise<FieldObservation[]> {
  const params = new URLSearchParams();
  if (category && category !== 'ALL') params.append('category', category);
  if (severity && severity !== 'ALL') params.append('severity', severity);
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/observations?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch field observations');
  return res.json();
}

export async function createFieldObservation(
  expeditionId: string,
  data: Partial<FieldObservation>
): Promise<FieldObservation> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/observations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create field observation');
  return res.json();
}

// -------------------------------------------------------------
// Operational Documents & Reports
// -------------------------------------------------------------
export async function fetchOperationalDocuments(
  expeditionId: string,
  entityType?: string,
  entityId?: string
): Promise<OperationalDocument[]> {
  const params = new URLSearchParams();
  if (entityType) params.append('entityType', entityType);
  if (entityId) params.append('entityId', entityId);
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/documents?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch operational documents');
  return res.json();
}

export async function attachOperationalDocument(
  expeditionId: string,
  data: Partial<OperationalDocument>
): Promise<OperationalDocument> {
  const res = await fetch(`${API_BASE}/expeditions/${expeditionId}/documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to attach operational document');
  return res.json();
}

// -------------------------------------------------------------
// Organization Management
// -------------------------------------------------------------
export async function fetchOrganizationOverview(organizationId: string): Promise<OrganizationOverview> {
  const res = await fetch(`${API_BASE}/organizations/${organizationId}/overview`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch organization overview');
  return res.json();
}

export async function fetchResourceAvailability(expeditionId: string, orgId?: string): Promise<any> {
  const url = `${API_BASE}/expeditions/${expeditionId}/resource-availability${orgId ? `?orgId=${orgId}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch resource availability');
  return res.json();
}




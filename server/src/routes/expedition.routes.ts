import { Router, Request, Response } from 'express';
import { ExpeditionService } from '../services/expedition.service.js';
import { StationService } from '../services/station.service.js';
import { PersonnelService } from '../services/personnel.service.js';
import { CargoService } from '../services/cargo.service.js';
import { InventoryService } from '../services/inventory.service.js';
import { AssetService } from '../services/asset.service.js';
import { MovementService } from '../services/movement.service.js';
import { IncidentService } from '../services/incident.service.js';
import { AlertService } from '../services/alert.service.js';
import { RecommendationService } from '../services/recommendation.service.js';
import { ActionService } from '../services/action.service.js';
import { SimulationService } from '../services/simulation.service.js';
import { RiskService } from '../services/risk.service.js';
import { AuditService } from '../services/audit.service.js';
import { TaskService } from '../services/task.service.js';
import { CheckInService } from '../services/checkin.service.js';
import { WeatherService } from '../services/weather.service.js';
import { ObservationService } from '../services/observation.service.js';
import { DocumentService } from '../services/document.service.js';
import { seedDemoData } from '../seed/demo-data.js';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.middleware.js';

export const expeditionRouter = Router();

const p = (v: any): string => (Array.isArray(v) ? v[0] : String(v));

// List all expeditions
expeditionRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const list = await ExpeditionService.listExpeditions();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list expeditions' });
  }
});

// Seed / Reseed Demo Data
expeditionRouter.post('/seed-demo', async (_req: Request, res: Response) => {
  try {
    await seedDemoData();
    const list = await ExpeditionService.listExpeditions();
    res.json({ success: true, message: 'Demo data reseeded successfully', expeditions: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed demo data' });
  }
});

// Create expedition
expeditionRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const expedition = await ExpeditionService.createExpedition(req.body, req.user);
    res.status(201).json(expedition);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create expedition' });
  }
});

// Get single expedition
expeditionRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const expedition = await ExpeditionService.getExpedition(p(req.params.id));
    if (!expedition) return res.status(404).json({ error: 'Expedition not found' });
    res.json(expedition);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get expedition' });
  }
});

// Update expedition
expeditionRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await ExpeditionService.updateExpedition(p(req.params.id), req.body, req.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update expedition' });
  }
});

// Delete expedition
expeditionRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await ExpeditionService.deleteExpedition(p(req.params.id), req.user);
    res.json(deleted);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete expedition' });
  }
});

// Dynamic Dashboard for Expedition
expeditionRouter.get('/:id/dashboard', async (req: Request, res: Response) => {
  try {
    const summary = await ExpeditionService.getDashboardSummary(p(req.params.id));
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load dashboard telemetry' });
  }
});

// Stations
expeditionRouter.get('/:id/stations', async (req: Request, res: Response) => {
  try {
    const stations = await StationService.listStations(p(req.params.id));
    res.json(stations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/stations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const station = await StationService.createStation(p(req.params.id), req.body, req.user);
    res.status(201).json(station);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Personnel
expeditionRouter.get('/:id/personnel', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string;
    const status = req.query.status as string;
    const personnel = await PersonnelService.listPersonnel(p(req.params.id), role, status);
    res.json(personnel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/personnel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const person = await PersonnelService.createPersonnel(p(req.params.id), req.body, req.user);
    res.status(201).json(person);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.put('/:id/personnel/:personId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await PersonnelService.updatePersonnel(p(req.params.personId), req.body, req.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.delete('/:id/personnel/:personId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await PersonnelService.deletePersonnel(p(req.params.personId), req.user);
    res.json(deleted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cargo
expeditionRouter.get('/:id/cargo', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const status = req.query.status as string;
    const cargo = await CargoService.listCargo(p(req.params.id), { category, status });
    res.json(cargo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.get('/:id/cargo/:cargoId', async (req: Request, res: Response) => {
  try {
    const item = await CargoService.getCargoItem(p(req.params.cargoId));
    if (!item) return res.status(404).json({ error: 'Cargo not found' });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/cargo', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cargo = await CargoService.createCargo(p(req.params.id), req.body, req.user);
    res.status(201).json(cargo);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.put('/:id/cargo/:cargoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await CargoService.updateCargo(p(req.params.cargoId), req.body, req.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.delete('/:id/cargo/:cargoId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await CargoService.deleteCargo(p(req.params.cargoId), req.user);
    res.json(deleted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Simulate Delay on ANY Cargo Shipment
expeditionRouter.post('/:id/cargo/:cargoId/simulate-delay', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const delayHours = Number(req.body.delayHours) || 48;
    const result = await CargoService.simulateCargoDelay(p(req.params.cargoId), delayHours, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Inventory
expeditionRouter.get('/:id/inventory', async (req: Request, res: Response) => {
  try {
    const stationId = req.query.station as string;
    const category = req.query.category as string;
    const items = await InventoryService.listInventory(p(req.params.id), stationId, category);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/inventory', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await InventoryService.createInventoryItem(p(req.params.id), req.body, req.user);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.put('/:id/inventory/:invId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await InventoryService.updateInventoryItem(p(req.params.invId), req.body, req.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.delete('/:id/inventory/:invId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await InventoryService.deleteInventoryItem(p(req.params.invId), req.user);
    res.json(deleted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Assets
expeditionRouter.get('/:id/assets', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string;
    const stationId = req.query.station as string;
    const assets = await AssetService.listAssets(p(req.params.id), type, stationId);
    res.json(assets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/assets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const asset = await AssetService.createAsset(p(req.params.id), req.body, req.user);
    res.status(201).json(asset);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.put('/:id/assets/:assetId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AssetService.updateAsset(p(req.params.assetId), req.body, req.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.delete('/:id/assets/:assetId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await AssetService.deleteAsset(p(req.params.assetId), req.user);
    res.json(deleted);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/assets/:assetId/maintenance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AssetService.recordMaintenance(p(req.params.assetId), req.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Movements
expeditionRouter.get('/:id/movements', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const movements = await MovementService.listMovements(p(req.params.id), status);
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/movements', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const movement = await MovementService.createMovement(p(req.params.id), req.body, req.user);
    res.status(201).json(movement);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.patch('/:id/movements/:movId/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, delayHours, notes, actualArrival, weatherConstraint } = req.body;
    const updated = await MovementService.updateMovementStatus(
      p(req.params.movId),
      status,
      { delayHours, notes, actualArrival, weatherConstraint },
      req.user
    );
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Incidents & Emergency Response
expeditionRouter.get('/:id/incidents', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const incidents = await IncidentService.listIncidents(p(req.params.id), status);
    res.json(incidents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/incidents', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const incident = await IncidentService.createIncident(p(req.params.id), req.body, req.user);
    res.status(201).json(incident);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/incidents/:incId/dispatch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dispatched = await IncidentService.dispatchResponse(p(req.params.incId), req.user);
    res.json(dispatched);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Alerts
expeditionRouter.get('/:id/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await AlertService.listAlerts(p(req.params.id));
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.patch('/:id/alerts/:alertId/status', async (req: Request, res: Response) => {
  try {
    const updated = await AlertService.updateAlertStatus(p(req.params.alertId), req.body.status);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Recommendations
expeditionRouter.get('/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const recs = await RecommendationService.generateRecommendations(p(req.params.id));
    res.json(recs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Action Execution
expeditionRouter.post('/:id/actions/execute', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user && (req.user.role === 'FIELD_MEMBER' || req.user.role === 'VIEWER')) {
    return res.status(403).json({ error: 'Forbidden: Field members and viewers are not authorized to execute command mitigations.' });
  }
  try {
    const result = await ActionService.executeAction({
      ...req.body,
      expeditionId: p(req.params.id),
      user: req.user,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.get('/:id/actions', async (req: Request, res: Response) => {
  try {
    const actions = await ActionService.listActions(p(req.params.id));
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// What-If Simulations
expeditionRouter.post('/:id/simulations/run', async (req: Request, res: Response) => {
  try {
    const result = await SimulationService.runSimulation({
      ...req.body,
      expeditionId: p(req.params.id),
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/simulations/:simId/apply', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user && (req.user.role === 'FIELD_MEMBER' || req.user.role === 'VIEWER')) {
    return res.status(403).json({ error: 'Forbidden: Field members and viewers cannot commit simulation changes to live operational state.' });
  }
  try {
    const result = await SimulationService.applyScenario(p(req.params.simId), req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/simulations/:simId/discard', async (req: Request, res: Response) => {
  try {
    const result = await SimulationService.discardScenario(p(req.params.simId));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Historical Risk Snapshots
expeditionRouter.get('/:id/risk-history', async (req: Request, res: Response) => {
  try {
    const history = await RiskService.getRiskHistory(p(req.params.id));
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Logs / Activity Stream
expeditionRouter.get('/:id/audit-logs', async (req: Request, res: Response) => {
  try {
    const logs = await AuditService.getRecentActivity(p(req.params.id));
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// EXPEDITION LIFECYCLE & PUBLISH
// -------------------------------------------------------------
expeditionRouter.post('/:id/publish', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await ExpeditionService.publishExpedition(p(req.params.id), req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.patch('/:id/lifecycle', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await ExpeditionService.updateLifecycle(p(req.params.id), req.body.lifecycleStatus, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// TASKS & MISSION OPERATIONS
// -------------------------------------------------------------
expeditionRouter.get('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const personnelId = req.query.personnelId as string;
    const stationId = req.query.stationId as string;
    const tasks = await TaskService.listTasks(p(req.params.id), { status, priority, personnelId, stationId });
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.get('/:id/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const task = await TaskService.getTask(p(req.params.taskId));
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/tasks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await TaskService.createTask(p(req.params.id), req.body, req.user);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.put('/:id/tasks/:taskId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await TaskService.updateTask(p(req.params.taskId), req.body, req.user);
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.patch('/:id/tasks/:taskId/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, notes, fieldObservations } = req.body;
    const task = await TaskService.updateTaskStatus(p(req.params.taskId), status, { notes, fieldObservations }, req.user);
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CHECK-IN & PERSONNEL ACCOUNTABILITY
// -------------------------------------------------------------
expeditionRouter.post('/:id/personnel/:personId/check-in', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await CheckInService.recordCheckIn(p(req.params.id), p(req.params.personId), req.body, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.get('/:id/personnel-accountability', async (req: Request, res: Response) => {
  try {
    const result = await CheckInService.getPersonnelAccountability(p(req.params.id));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CARGO RECEIVING AT STATION
// -------------------------------------------------------------
expeditionRouter.post('/:id/cargo/:cargoId/receive', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await CargoService.receiveCargo(p(req.params.cargoId), req.body, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// EMERGENCY / SOS BEACON & INCIDENT RESOLUTION
// -------------------------------------------------------------
expeditionRouter.post('/:id/emergency/sos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const incident = await IncidentService.triggerSos(p(req.params.id), req.body, req.user);
    res.status(201).json(incident);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/incidents/:incId/resolve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const incident = await IncidentService.resolveIncident(p(req.params.incId), req.body, req.user);
    res.json(incident);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// OPERATIONAL READINESS & LIFECYCLE
// -------------------------------------------------------------
expeditionRouter.get('/:id/readiness', async (req: Request, res: Response) => {
  try {
    const readiness = await ExpeditionService.evaluateReadiness(p(req.params.id));
    res.json(readiness);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.get('/:id/resource-availability', async (req: Request, res: Response) => {
  try {
    const orgId = req.query.orgId as string | undefined;
    const availability = await ExpeditionService.checkResourceAvailability(orgId);
    res.json(availability);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/publish', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user && (req.user.role === 'FIELD_MEMBER' || req.user.role === 'VIEWER')) {
    return res.status(403).json({ error: 'Forbidden: Field members and viewers are not authorized to publish expeditions.' });
  }
  try {
    const published = await ExpeditionService.publishExpedition(p(req.params.id), req.user);
    res.json(published);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/lifecycle', async (req: AuthenticatedRequest, res: Response) => {
  if (req.user && (req.user.role === 'FIELD_MEMBER' || req.user.role === 'VIEWER')) {
    return res.status(403).json({ error: 'Forbidden: Field members and viewers cannot change lifecycle state.' });
  }
  try {
    const updated = await ExpeditionService.updateLifecycle(p(req.params.id), req.body.lifecycleStatus, req.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// WEATHER TELEMETRY & CONSTRAINTS
// -------------------------------------------------------------
expeditionRouter.get('/:id/stations/:stationId/weather', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const weather = await WeatherService.getStationWeather(p(req.params.stationId), forceRefresh);
    res.json(weather);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/movements/:movId/weather-constraint', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stationId = req.body.stationId;
    if (!stationId) return res.status(400).json({ error: 'stationId is required' });
    const weather = await WeatherService.getStationWeather(stationId);
    const updated = await MovementService.applyWeatherConstraint(p(req.params.movId), weather, req.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// FIELD OBSERVATIONS
// -------------------------------------------------------------
expeditionRouter.get('/:id/observations', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const severity = req.query.severity as string;
    const list = await ObservationService.listObservations(p(req.params.id), category, severity);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/observations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const obs = await ObservationService.createObservation({
      ...req.body,
      expeditionId: p(req.params.id),
      user: req.user,
    });
    res.status(201).json(obs);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// OPERATIONAL DOCUMENTS & ATTACHMENTS
// -------------------------------------------------------------
expeditionRouter.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId as string;
    const docs = await DocumentService.listDocuments(p(req.params.id), entityType, entityId);
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

expeditionRouter.post('/:id/documents', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const doc = await DocumentService.attachDocument({
      ...req.body,
      expeditionId: p(req.params.id),
      user: req.user,
    });
    res.status(201).json(doc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


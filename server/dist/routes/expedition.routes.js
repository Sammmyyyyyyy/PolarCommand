import { Router } from 'express';
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
import { seedDemoData } from '../seed/demo-data.js';
export const expeditionRouter = Router();
const p = (v) => (Array.isArray(v) ? v[0] : String(v));
// List all expeditions
expeditionRouter.get('/', async (_req, res) => {
    try {
        const list = await ExpeditionService.listExpeditions();
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to list expeditions' });
    }
});
// Seed / Reseed Demo Data
expeditionRouter.post('/seed-demo', async (_req, res) => {
    try {
        await seedDemoData();
        const list = await ExpeditionService.listExpeditions();
        res.json({ success: true, message: 'Demo data reseeded successfully', expeditions: list });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to seed demo data' });
    }
});
// Create expedition
expeditionRouter.post('/', async (req, res) => {
    try {
        const expedition = await ExpeditionService.createExpedition(req.body, req.user);
        res.status(201).json(expedition);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create expedition' });
    }
});
// Get single expedition
expeditionRouter.get('/:id', async (req, res) => {
    try {
        const expedition = await ExpeditionService.getExpedition(p(req.params.id));
        if (!expedition)
            return res.status(404).json({ error: 'Expedition not found' });
        res.json(expedition);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to get expedition' });
    }
});
// Update expedition
expeditionRouter.put('/:id', async (req, res) => {
    try {
        const updated = await ExpeditionService.updateExpedition(p(req.params.id), req.body, req.user);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to update expedition' });
    }
});
// Delete expedition
expeditionRouter.delete('/:id', async (req, res) => {
    try {
        const deleted = await ExpeditionService.deleteExpedition(p(req.params.id), req.user);
        res.json(deleted);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to delete expedition' });
    }
});
// Dynamic Dashboard for Expedition
expeditionRouter.get('/:id/dashboard', async (req, res) => {
    try {
        const summary = await ExpeditionService.getDashboardSummary(p(req.params.id));
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load dashboard telemetry' });
    }
});
// Stations
expeditionRouter.get('/:id/stations', async (req, res) => {
    try {
        const stations = await StationService.listStations(p(req.params.id));
        res.json(stations);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/stations', async (req, res) => {
    try {
        const station = await StationService.createStation(p(req.params.id), req.body, req.user);
        res.status(201).json(station);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Personnel
expeditionRouter.get('/:id/personnel', async (req, res) => {
    try {
        const role = req.query.role;
        const status = req.query.status;
        const personnel = await PersonnelService.listPersonnel(p(req.params.id), role, status);
        res.json(personnel);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/personnel', async (req, res) => {
    try {
        const person = await PersonnelService.createPersonnel(p(req.params.id), req.body, req.user);
        res.status(201).json(person);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.put('/:id/personnel/:personId', async (req, res) => {
    try {
        const updated = await PersonnelService.updatePersonnel(p(req.params.personId), req.body, req.user);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.delete('/:id/personnel/:personId', async (req, res) => {
    try {
        const deleted = await PersonnelService.deletePersonnel(p(req.params.personId), req.user);
        res.json(deleted);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Cargo
expeditionRouter.get('/:id/cargo', async (req, res) => {
    try {
        const category = req.query.category;
        const status = req.query.status;
        const cargo = await CargoService.listCargo(p(req.params.id), { category, status });
        res.json(cargo);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.get('/:id/cargo/:cargoId', async (req, res) => {
    try {
        const item = await CargoService.getCargoItem(p(req.params.cargoId));
        if (!item)
            return res.status(404).json({ error: 'Cargo not found' });
        res.json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/cargo', async (req, res) => {
    try {
        const cargo = await CargoService.createCargo(p(req.params.id), req.body, req.user);
        res.status(201).json(cargo);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.put('/:id/cargo/:cargoId', async (req, res) => {
    try {
        const updated = await CargoService.updateCargo(p(req.params.cargoId), req.body, req.user);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.delete('/:id/cargo/:cargoId', async (req, res) => {
    try {
        const deleted = await CargoService.deleteCargo(p(req.params.cargoId), req.user);
        res.json(deleted);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Simulate Delay on ANY Cargo Shipment
expeditionRouter.post('/:id/cargo/:cargoId/simulate-delay', async (req, res) => {
    try {
        const delayHours = Number(req.body.delayHours) || 48;
        const result = await CargoService.simulateCargoDelay(p(req.params.cargoId), delayHours, req.user);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Inventory
expeditionRouter.get('/:id/inventory', async (req, res) => {
    try {
        const stationId = req.query.station;
        const category = req.query.category;
        const items = await InventoryService.listInventory(p(req.params.id), stationId, category);
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/inventory', async (req, res) => {
    try {
        const item = await InventoryService.createInventoryItem(p(req.params.id), req.body, req.user);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.put('/:id/inventory/:invId', async (req, res) => {
    try {
        const updated = await InventoryService.updateInventoryItem(p(req.params.invId), req.body, req.user);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.delete('/:id/inventory/:invId', async (req, res) => {
    try {
        const deleted = await InventoryService.deleteInventoryItem(p(req.params.invId), req.user);
        res.json(deleted);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Assets
expeditionRouter.get('/:id/assets', async (req, res) => {
    try {
        const type = req.query.type;
        const stationId = req.query.station;
        const assets = await AssetService.listAssets(p(req.params.id), type, stationId);
        res.json(assets);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/assets', async (req, res) => {
    try {
        const asset = await AssetService.createAsset(p(req.params.id), req.body, req.user);
        res.status(201).json(asset);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.put('/:id/assets/:assetId', async (req, res) => {
    try {
        const updated = await AssetService.updateAsset(p(req.params.assetId), req.body, req.user);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.delete('/:id/assets/:assetId', async (req, res) => {
    try {
        const deleted = await AssetService.deleteAsset(p(req.params.assetId), req.user);
        res.json(deleted);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/assets/:assetId/maintenance', async (req, res) => {
    try {
        const updated = await AssetService.recordMaintenance(p(req.params.assetId), req.user);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Movements
expeditionRouter.get('/:id/movements', async (req, res) => {
    try {
        const status = req.query.status;
        const movements = await MovementService.listMovements(p(req.params.id), status);
        res.json(movements);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/movements', async (req, res) => {
    try {
        const movement = await MovementService.createMovement(p(req.params.id), req.body, req.user);
        res.status(201).json(movement);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.patch('/:id/movements/:movId/status', async (req, res) => {
    try {
        const updated = await MovementService.updateMovementStatus(p(req.params.movId), req.body.status, req.user);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Incidents & Emergency Response
expeditionRouter.get('/:id/incidents', async (req, res) => {
    try {
        const status = req.query.status;
        const incidents = await IncidentService.listIncidents(p(req.params.id), status);
        res.json(incidents);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/incidents', async (req, res) => {
    try {
        const incident = await IncidentService.createIncident(p(req.params.id), req.body, req.user);
        res.status(201).json(incident);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/incidents/:incId/dispatch', async (req, res) => {
    try {
        const dispatched = await IncidentService.dispatchResponse(p(req.params.incId), req.user);
        res.json(dispatched);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Alerts
expeditionRouter.get('/:id/alerts', async (req, res) => {
    try {
        const alerts = await AlertService.listAlerts(p(req.params.id));
        res.json(alerts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
expeditionRouter.patch('/:id/alerts/:alertId/status', async (req, res) => {
    try {
        const updated = await AlertService.updateAlertStatus(p(req.params.alertId), req.body.status);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Recommendations
expeditionRouter.get('/:id/recommendations', async (req, res) => {
    try {
        const recs = await RecommendationService.generateRecommendations(p(req.params.id));
        res.json(recs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Action Execution
expeditionRouter.post('/:id/actions/execute', async (req, res) => {
    try {
        const result = await ActionService.executeAction({
            ...req.body,
            expeditionId: p(req.params.id),
            user: req.user,
        });
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.get('/:id/actions', async (req, res) => {
    try {
        const actions = await ActionService.listActions(p(req.params.id));
        res.json(actions);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// What-If Simulations
expeditionRouter.post('/:id/simulations/run', async (req, res) => {
    try {
        const result = await SimulationService.runSimulation({
            ...req.body,
            expeditionId: p(req.params.id),
        });
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/simulations/:simId/apply', async (req, res) => {
    try {
        const result = await SimulationService.applyScenario(p(req.params.simId), req.user);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
expeditionRouter.post('/:id/simulations/:simId/discard', async (req, res) => {
    try {
        const result = await SimulationService.discardScenario(p(req.params.simId));
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Historical Risk Snapshots
expeditionRouter.get('/:id/risk-history', async (req, res) => {
    try {
        const history = await RiskService.getRiskHistory(p(req.params.id));
        res.json(history);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Audit Logs / Activity Stream
expeditionRouter.get('/:id/audit-logs', async (req, res) => {
    try {
        const logs = await AuditService.getRecentActivity(p(req.params.id));
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});

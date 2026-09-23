import { Router } from 'express';
import { stateEngine } from './stateEngine.js';
export const apiRouter = Router();
// Dashboard Summary
apiRouter.get('/dashboard', (_req, res) => {
    res.json(stateEngine.getDashboard());
});
// Expeditions
apiRouter.get('/expeditions', (_req, res) => {
    res.json(stateEngine.getExpeditions());
});
apiRouter.get('/expeditions/:id', (req, res) => {
    const id = String(req.params.id);
    const item = stateEngine.getExpedition(id);
    if (!item)
        return res.status(404).json({ error: 'Expedition not found' });
    res.json(item);
});
// Stations
apiRouter.get('/stations', (_req, res) => {
    res.json(stateEngine.getStations());
});
apiRouter.get('/stations/:id', (req, res) => {
    const id = String(req.params.id);
    const item = stateEngine.getStation(id);
    if (!item)
        return res.status(404).json({ error: 'Station not found' });
    res.json(item);
});
// Cargo
apiRouter.get('/cargo', (_req, res) => {
    res.json(stateEngine.getCargo());
});
apiRouter.get('/cargo/:id', (req, res) => {
    const id = String(req.params.id);
    const item = stateEngine.getCargoItem(id);
    if (!item)
        return res.status(404).json({ error: 'Cargo shipment not found' });
    res.json(item);
});
// Hero Simulation: Simulate Cargo Delay
apiRouter.post('/cargo/:id/simulate-delay', (req, res) => {
    const id = String(req.params.id);
    const delayHours = Number(req.body.delayHours) || 48;
    try {
        const result = stateEngine.simulateCargoDelay(id, delayHours);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Simulation error' });
    }
});
// Inventory
apiRouter.get('/inventory', (req, res) => {
    const stationId = req.query.station ? String(req.query.station) : undefined;
    res.json(stateEngine.getInventory(stationId));
});
apiRouter.get('/inventory/:stationId', (req, res) => {
    const stationId = String(req.params.stationId);
    res.json(stateEngine.getInventory(stationId));
});
// Assets
apiRouter.get('/assets', (_req, res) => {
    res.json(stateEngine.getAssets());
});
apiRouter.get('/assets/:id', (req, res) => {
    const id = String(req.params.id);
    const item = stateEngine.getAsset(id);
    if (!item)
        return res.status(404).json({ error: 'Asset not found' });
    res.json(item);
});
// Personnel
apiRouter.get('/personnel', (_req, res) => {
    res.json(stateEngine.getPersonnel());
});
apiRouter.get('/personnel/:id', (req, res) => {
    const id = String(req.params.id);
    const item = stateEngine.getPersonnelMember(id);
    if (!item)
        return res.status(404).json({ error: 'Personnel member not found' });
    res.json(item);
});
// Incidents
apiRouter.get('/incidents', (_req, res) => {
    res.json(stateEngine.getIncidents());
});
apiRouter.post('/incidents', (req, res) => {
    const incident = stateEngine.createIncident(req.body);
    res.status(201).json(incident);
});
// Alerts
apiRouter.get('/alerts', (_req, res) => {
    res.json(stateEngine.getAlerts());
});
apiRouter.patch('/alerts/:id', (req, res) => {
    const id = String(req.params.id);
    const updated = stateEngine.updateAlert(id, req.body);
    if (!updated)
        return res.status(404).json({ error: 'Alert not found' });
    res.json(updated);
});
// Actions
apiRouter.get('/actions', (_req, res) => {
    res.json(stateEngine.getActions());
});
apiRouter.post('/actions', (req, res) => {
    const action = stateEngine.createAction(req.body);
    res.status(201).json(action);
});
// What-If Simulation
apiRouter.post('/simulations', (req, res) => {
    const result = stateEngine.runWhatIfSimulation(req.body);
    res.json(result);
});
// Resource Optimization (Cargo allocation)
apiRouter.post('/optimization/cargo-allocation', (req, res) => {
    const vehicleId = req.body.vehicleId || 'PB-07';
    const plan = stateEngine.optimizeCargoAllocation(vehicleId);
    res.json(plan);
});
// Hero Action Execution (Reallocate emergency medical reserve)
apiRouter.post('/hero-action', (_req, res) => {
    const result = stateEngine.executeHeroAction();
    res.json(result);
});
// Reset Demo State
apiRouter.post('/reset-demo', (_req, res) => {
    stateEngine.resetDemo();
    res.json({ success: true, message: 'Demo state reset to baseline (Risk: 38)' });
});

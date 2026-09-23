import express from 'express';
import cors from 'cors';
import { checkDatabaseConnection, prisma } from './config/database.js';
import { authRouter } from './routes/auth.routes.js';
import { expeditionRouter } from './routes/expedition.routes.js';
import { seedDemoData } from './seed/demo-data.js';
import { authenticateJWT } from './middleware/auth.middleware.js';
import { ExpeditionService } from './services/expedition.service.js';
import { CargoService } from './services/cargo.service.js';
import { ActionService } from './services/action.service.js';
import { InventoryService } from './services/inventory.service.js';
import { AssetService } from './services/asset.service.js';
import { PersonnelService } from './services/personnel.service.js';
import { IncidentService } from './services/incident.service.js';
import { AlertService } from './services/alert.service.js';
import { SimulationService } from './services/simulation.service.js';
import { StationService } from './services/station.service.js';
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use(authenticateJWT);
// Health check endpoint
app.get('/api/health', async (_req, res) => {
    const dbOk = await checkDatabaseConnection();
    res.json({
        status: dbOk ? 'ONLINE' : 'DEGRADED',
        service: 'POLAR COMMAND Mission Control & Decision Support API',
        database: dbOk ? 'CONNECTED' : 'DISCONNECTED',
        timestamp: new Date().toISOString(),
    });
});
// Main Route Routers
app.use('/api/auth', authRouter);
app.use('/api/expeditions', expeditionRouter);
// Helper to get active default expedition (INPEX-2027 or first available)
async function getDefaultExpeditionId() {
    const exp = await prisma.expedition.findFirst({
        where: { code: 'INPEX-2027' },
    });
    if (exp)
        return exp.id;
    const anyExp = await prisma.expedition.findFirst();
    if (anyExp)
        return anyExp.id;
    await seedDemoData();
    const seeded = await prisma.expedition.findFirst();
    return seeded.id;
}
// -------------------------------------------------------------
// Backward Compatibility Endpoints (Delegating to active expedition)
// -------------------------------------------------------------
app.get('/api/dashboard', async (req, res) => {
    try {
        const expId = req.query.expeditionId || (await getDefaultExpeditionId());
        const dashboard = await ExpeditionService.getDashboardSummary(expId);
        res.json(dashboard);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/stations', async (_req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const stations = await StationService.listStations(expId);
        res.json(stations);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/cargo', async (req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const cargo = await CargoService.listCargo(expId, req.query);
        res.json(cargo);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/cargo/:id', async (req, res) => {
    try {
        const item = await CargoService.getCargoItem(req.params.id);
        if (!item)
            return res.status(404).json({ error: 'Cargo not found' });
        res.json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/cargo/:id/simulate-delay', async (req, res) => {
    try {
        const delayHours = Number(req.body.delayHours) || 48;
        const result = await CargoService.simulateCargoDelay(req.params.id, delayHours);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.get('/api/inventory', async (req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const station = req.query.station;
        const category = req.query.category;
        const inv = await InventoryService.listInventory(expId, station, category);
        res.json(inv);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/assets', async (req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const type = req.query.type;
        const station = req.query.station;
        const assets = await AssetService.listAssets(expId, type, station);
        res.json(assets);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/personnel', async (req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const role = req.query.role;
        const status = req.query.status;
        const people = await PersonnelService.listPersonnel(expId, role, status);
        res.json(people);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/incidents', async (_req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const incidents = await IncidentService.listIncidents(expId);
        res.json(incidents);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/incidents', async (req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const inc = await IncidentService.createIncident(expId, req.body);
        res.status(201).json(inc);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.get('/api/alerts', async (_req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const alerts = await AlertService.listAlerts(expId);
        res.json(alerts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.patch('/api/alerts/:id', async (req, res) => {
    try {
        const updated = await AlertService.updateAlertStatus(req.params.id, req.body.status);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.get('/api/actions', async (_req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const actions = await ActionService.listActions(expId);
        res.json(actions);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/simulations', async (req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const result = await SimulationService.runSimulation({
            ...req.body,
            expeditionId: expId,
        });
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Hero action execution (reallocate medical reserve)
app.post('/api/hero-action', async (_req, res) => {
    try {
        const expId = await getDefaultExpeditionId();
        const maitri = await prisma.station.findFirst({ where: { expeditionId: expId, code: 'MAITRI' } });
        const bharati = await prisma.station.findFirst({ where: { expeditionId: expId, code: 'BHARATI' } });
        const result = await ActionService.executeAction({
            expeditionId: expId,
            actionType: 'INVENTORY_REALLOCATION',
            donorStationId: maitri?.id,
            recipientStationId: bharati?.id,
            inventoryCategory: 'Medicine',
            transferQuantity: 150,
            title: 'Emergency Medical Reserve Reallocation',
            assignedTo: 'Inter-Station Aviation Dispatch',
        });
        res.json({
            success: true,
            message: 'Emergency Medical Reserve reallocated from Maitri. Stock restored to safe operational buffer.',
            recoveredRisk: result.newRisk.totalScore,
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Reset demo state
app.post('/api/reset-demo', async (_req, res) => {
    try {
        await seedDemoData();
        res.json({ success: true, message: 'Demo state reset to baseline (Risk: 38)' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Start Server
app.listen(PORT, async () => {
    console.log(`[POLAR COMMAND] Operational Intelligence Engine listening on http://localhost:${PORT}`);
    console.log(`[POLAR COMMAND] REST endpoints registered under /api/*`);
    // Ensure DB connection and seed if first start
    const isConnected = await checkDatabaseConnection();
    if (isConnected) {
        const expeditionCount = await prisma.expedition.count();
        if (expeditionCount === 0) {
            console.log('[POLAR COMMAND] Empty database detected. Auto-seeding initial baseline...');
            await seedDemoData();
        }
    }
});

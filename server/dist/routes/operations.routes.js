import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission, enforceResourceScope, normalizeRole } from '../middleware/authorization.js';
import { InventoryService } from '../services/inventory.service.js';
import { AssetService } from '../services/asset.service.js';
import { TrackingService } from '../services/tracking.service.js';
import { IncidentService } from '../services/incident.service.js';
import { ExpeditionService } from '../services/expedition.service.js';
import { prisma } from '../config/database.js';
export const operationsRouter = Router();
const p = (v) => (Array.isArray(v) ? v[0] : String(v || ''));
// ==========================================
// 0. ADMIN GLOBAL COMMAND CENTER TELEMETRY
// ==========================================
operationsRouter.get('/admin/summary', async (req, res) => {
    try {
        const summary = await ExpeditionService.getAdminGlobalOverview();
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load admin global telemetry' });
    }
});
// ==========================================
// 1. INVENTORY & RESTOCK REQUEST WORKFLOW
// ==========================================
// Get inventory for a station (Station Manager scoped, Admin global)
operationsRouter.get('/stations/:stationId/inventory', async (req, res) => {
    try {
        const stationId = p(req.params.stationId);
        const userRole = normalizeRole(req.user?.role);
        // If Station Manager, verify scoping
        if (userRole === 'STATION_MANAGER' && req.user?.stationId && req.user.stationId !== stationId) {
            return res.status(403).json({
                error: 'Forbidden: Station Managers can only access inventory of their assigned station.',
            });
        }
        const items = await InventoryService.listInventory(undefined, stationId);
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch station inventory' });
    }
});
// Station Manager adds new inventory item to station
operationsRouter.post('/stations/:stationId/inventory', requireAuth, requirePermission('inventory:manage'), enforceResourceScope('station'), async (req, res) => {
    try {
        const stationId = p(req.params.stationId);
        const item = await InventoryService.createInventoryItem(stationId, req.body, req.user);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create inventory item' });
    }
});
// Update inventory item (quantities, thresholds, etc.)
operationsRouter.put('/inventory/:id', requireAuth, requirePermission('inventory:manage'), async (req, res) => {
    try {
        const id = p(req.params.id);
        const updated = await InventoryService.updateInventoryItem(id, req.body, req.user);
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to update inventory item' });
    }
});
// Delete inventory item
operationsRouter.delete('/inventory/:id', requireAuth, requirePermission('inventory:manage'), async (req, res) => {
    try {
        const id = p(req.params.id);
        const deleted = await InventoryService.deleteInventoryItem(id, req.user);
        res.json(deleted);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to delete inventory item' });
    }
});
// Station Manager initiates Restock Request for low/shortage item
operationsRouter.post('/inventory/:id/restock-request', requireAuth, requirePermission('inventory:request_restock'), async (req, res) => {
    try {
        const id = p(req.params.id);
        const restock = await InventoryService.createRestockRequest(id, req.body, req.user);
        res.status(201).json(restock);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create restock request' });
    }
});
// List restock requests (Admin sees global, Station Manager sees scoped to their station)
operationsRouter.get('/restock-requests', async (req, res) => {
    try {
        const userRole = normalizeRole(req.user?.role);
        let stationId = req.query.stationId ? p(req.query.stationId) : undefined;
        if (userRole === 'STATION_MANAGER') {
            stationId = req.user?.stationId || stationId;
        }
        const requests = await InventoryService.listRestockRequests({
            stationId,
            status: req.query.status ? p(req.query.status) : undefined,
        });
        res.json(requests);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to list restock requests' });
    }
});
// Get single restock request
operationsRouter.get('/restock-requests/:id', async (req, res) => {
    try {
        const request = await InventoryService.getRestockRequest(p(req.params.id));
        if (!request)
            return res.status(404).json({ error: 'Restock request not found' });
        res.json(request);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to get restock request' });
    }
});
// ADMIN fulfills Restock Request by creating/dispatching Cargo Operation
operationsRouter.post('/restock-requests/:id/create-cargo', requireAuth, requirePermission('cargo:create'), async (req, res) => {
    try {
        const id = p(req.params.id);
        const result = await InventoryService.fulfillWithCargo(id, req.body, req.user);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to create cargo for restock request' });
    }
});
// ==========================================
// 2. EQUIPMENT & ASSIGNMENT WORKFLOW
// ==========================================
// List equipment / assets
operationsRouter.get('/equipment', async (req, res) => {
    try {
        const expeditionId = req.query.expeditionId ? p(req.query.expeditionId) : undefined;
        const stationId = req.query.stationId ? p(req.query.stationId) : undefined;
        const type = req.query.type ? p(req.query.type) : undefined;
        const assets = await AssetService.listAssets(expeditionId, type, stationId);
        res.json(assets);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to list equipment' });
    }
});
// Get equipment assigned to currently authenticated user / personnel (My Equipment)
operationsRouter.get('/my/equipment', requireAuth, async (req, res) => {
    try {
        const personnelId = req.user?.assignedPersonnelId;
        if (!personnelId) {
            return res.json([]);
        }
        const equipment = await AssetService.listEquipmentForPersonnel(personnelId);
        res.json(equipment);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch assigned equipment' });
    }
});
// Expedition Leader or Admin assigns equipment to a team member
operationsRouter.post('/equipment/:id/assign', requireAuth, requirePermission('equipment:assign'), async (req, res) => {
    try {
        const id = p(req.params.id);
        const { personnelId } = req.body;
        if (!personnelId) {
            return res.status(400).json({ error: 'personnelId is required for equipment assignment' });
        }
        const assigned = await AssetService.assignEquipment(id, p(personnelId), req.user);
        res.json(assigned);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to assign equipment' });
    }
});
// Expedition Leader or Admin unassigns equipment
operationsRouter.post('/equipment/:id/unassign', requireAuth, requirePermission('equipment:assign'), async (req, res) => {
    try {
        const id = p(req.params.id);
        const unassigned = await AssetService.unassignEquipment(id, req.user);
        res.json(unassigned);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to unassign equipment' });
    }
});
// ==========================================
// 3. TRACKING & GPS TELEMETRY
// ==========================================
// Record GPS / device tracking ping
operationsRouter.post('/tracking/location', async (req, res) => {
    try {
        const { personnelId, expeditionId, deviceId, latitude, longitude, battery, connectionStatus, isSos } = req.body;
        if (!personnelId || !expeditionId || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'personnelId, expeditionId, latitude, and longitude are required' });
        }
        const ping = await TrackingService.recordLocationPing({
            personnelId: p(personnelId),
            expeditionId: p(expeditionId),
            deviceId: deviceId ? p(deviceId) : undefined,
            latitude: Number(latitude),
            longitude: Number(longitude),
            battery: battery !== undefined ? Number(battery) : undefined,
            connectionStatus: connectionStatus ? p(connectionStatus) : undefined,
            isSos: Boolean(isSos),
        }, req.user);
        res.status(201).json(ping);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to record tracking ping' });
    }
});
// Get tracking for expedition (LIVE / LAST_KNOWN / OFFLINE)
operationsRouter.get('/tracking/:expeditionId', async (req, res) => {
    try {
        const expeditionId = p(req.params.expeditionId);
        const userRole = normalizeRole(req.user?.role);
        // Enforce scoping for Team Members: can only see their own expedition
        if (userRole === 'TEAM_MEMBER' && req.user?.assignedExpeditionId && req.user.assignedExpeditionId !== expeditionId) {
            return res.status(403).json({ error: 'Forbidden: You can only view tracking of your assigned expedition.' });
        }
        const trackingData = await TrackingService.getExpeditionTracking(expeditionId, req.user?.assignedPersonnelId || undefined);
        res.json(trackingData);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to get expedition tracking' });
    }
});
// Team Member: view members of the SAME expedition only
operationsRouter.get('/expeditions/:expeditionId/team-map', requireAuth, async (req, res) => {
    try {
        const expeditionId = p(req.params.expeditionId);
        const userRole = normalizeRole(req.user?.role);
        if (userRole === 'TEAM_MEMBER' && req.user?.assignedExpeditionId && req.user.assignedExpeditionId !== expeditionId) {
            return res.status(403).json({ error: 'Forbidden: You can only access team map for your assigned expedition.' });
        }
        const trackingData = await TrackingService.getExpeditionTracking(expeditionId, req.user?.assignedPersonnelId || undefined);
        res.json(trackingData);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load team map' });
    }
});
// ==========================================
// 4. EMERGENCY & INCIDENT DISPATCH
// ==========================================
// Emergency reporting from Team Member or any field personnel
operationsRouter.post('/emergencies', requireAuth, requirePermission('incident:create'), async (req, res) => {
    try {
        const expId = req.body.expeditionId || req.user?.assignedExpeditionId;
        let targetExpId = expId ? p(expId) : '';
        if (!targetExpId) {
            const rootExp = await prisma.expedition.findFirst();
            if (!rootExp)
                throw new Error('No active expedition found');
            targetExpId = rootExp.id;
        }
        const incident = await IncidentService.createIncident(targetExpId, {
            ...req.body,
            isSosEmergency: true,
            severity: 'CRITICAL',
            type: req.body.type || 'SOS Beacon',
        }, req.user);
        res.status(201).json(incident);
    }
    catch (err) {
        res.status(400).json({ error: err.message || 'Failed to report emergency' });
    }
});

import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { eventBus } from '../events/eventBus.js';
export class IncidentService {
    static async listIncidents(expeditionId, status) {
        const where = { expeditionId };
        if (status && status !== 'All')
            where.status = status;
        return prisma.incident.findMany({
            where,
            include: {
                targetStation: true,
                assignedPersonnel: true,
                assignedAsset: true,
                reporterUser: { select: { id: true, name: true, role: true, email: true } },
            },
            orderBy: { timestamp: 'desc' },
        });
    }
    static async getIncident(id) {
        return prisma.incident.findUnique({
            where: { id },
            include: {
                targetStation: true,
                assignedPersonnel: true,
                assignedAsset: true,
                reporterUser: { select: { id: true, name: true, role: true, email: true } },
            },
        });
    }
    static async createIncident(expeditionId, data, user) {
        const expedition = await prisma.expedition.findUnique({
            where: { id: expeditionId },
            include: {
                stations: true,
                personnel: true,
                assets: true,
            },
        });
        if (!expedition)
            throw new Error(`Expedition ${expeditionId} not found`);
        // Determine nearest station from location or default
        const locationLower = (data.location || '').toLowerCase();
        const nearestStation = expedition.stations.find((s) => locationLower.includes(s.name.toLowerCase()) || locationLower.includes(s.code.toLowerCase())) ||
            expedition.stations[0] ||
            null;
        // Find nearest qualified personnel (Doctor if medical, Engineer if vehicle, or available personnel)
        const isMedical = data.type === 'Medical Emergency' || data.type === 'Missing Personnel' || data.isSosEmergency;
        const qualifiedPersonnel = expedition.personnel.find((p) => isMedical
            ? p.role.toLowerCase().includes('doctor') && p.emergencyAvailability !== 'Active'
            : p.role.toLowerCase().includes('engineer') || p.role.toLowerCase().includes('tech')) ||
            expedition.personnel.find((p) => p.emergencyAvailability === 'Available') ||
            expedition.personnel[0];
        // Find available vehicle
        const availableVehicle = expedition.assets.find((a) => a.type.toLowerCase().includes('vehicle') && (a.status === 'Operational' || a.status === 'Standby')) || expedition.assets[0];
        const incidentCode = `INC-${Date.now().toString().slice(-4)}`;
        const responsePlan = {
            nearestStationName: nearestStation?.name || 'Bharati Station',
            nearestVehicleName: availableVehicle ? `${availableVehicle.name} (${availableVehicle.assetCode})` : 'Rescue Spec Snowcat',
            nearestPersonnelName: qualifiedPersonnel ? `${qualifiedPersonnel.name} (${qualifiedPersonnel.role})` : 'Lead Medical Officer',
            etaMinutes: 38,
            recommendedSteps: [
                `Mobilize ${availableVehicle ? availableVehicle.name : 'Emergency Vehicle'} from ${nearestStation?.name || 'Base'}`,
                `Assign ${qualifiedPersonnel ? qualifiedPersonnel.name : 'Officer'} to on-ice response and triage`,
                'Establish VHF simplex relay and satellite beacon tracking',
                'Prepare emergency survival shelter and field stabilization equipment',
            ],
        };
        const isSos = Boolean(data.isSosEmergency);
        const incident = await prisma.incident.create({
            data: {
                expeditionId,
                incidentCode,
                type: data.type || (isSos ? 'SOS Beacon' : 'Vehicle Breakdown'),
                title: data.title || (isSos ? `SOS: Immediate Rescue Signal - ${data.location || 'Field Zone'}` : `${data.type} Alert at ${data.location || 'Field Zone'}`),
                location: data.location || '15 km from Station',
                latitude: data.latitude ? Number(data.latitude) : -69.42,
                longitude: data.longitude ? Number(data.longitude) : 76.22,
                severity: isSos ? 'CRITICAL' : data.severity || 'HIGH',
                peopleAffected: Number(data.peopleAffected) || 1,
                description: data.description || (isSos ? 'EMERGENCY SOS BEACON TRIGGERED: Immediate rescue and medical dispatch requested.' : 'Emergency field incident reported. Rapid response required.'),
                requiredSupport: data.requiredSupport || (isSos ? 'Emergency Evacuation & SAR Team' : 'Medical & Mechanical Dispatch'),
                status: 'In Progress',
                isSosEmergency: isSos,
                reporterUserId: user?.id || null,
                reporterName: user?.name || data.reporterName || 'Field Member',
                targetStationId: nearestStation?.id || null,
                assignedPersonnelId: qualifiedPersonnel?.id || null,
                assignedAssetId: availableVehicle?.id || null,
                responseEtaMinutes: 38,
                responsePlanJson: JSON.stringify(responsePlan),
            },
            include: {
                targetStation: true,
                assignedPersonnel: true,
                assignedAsset: true,
            },
        });
        // Create linked Alert
        await prisma.alert.create({
            data: {
                expeditionId,
                severity: incident.severity,
                title: isSos ? `EMERGENCY SOS BEACON: ${incident.location}` : `EMERGENCY: ${incident.title}`,
                source: isSos ? 'Field Emergency SOS System' : 'Incident Response Dispatcher',
                affectedEntity: incident.location,
                reason: incident.description,
                impact: `${incident.peopleAffected} personnel impacted; operational rescue dispatch required.`,
                recommendedAction: responsePlan.recommendedSteps[0],
                status: 'ACTIVE',
            },
        });
        // Recalculate Risk & Alerts
        await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
        await AlertService.evaluateAndSyncAlerts(expeditionId);
        eventBus.emitDomainEvent('IncidentCreated', {
            expeditionId,
            incidentId: incident.id,
            severity: incident.severity,
        });
        await AuditService.record({
            expeditionId,
            userId: user?.id,
            userName: user?.name || incident.reporterName,
            userRole: user?.role || 'FIELD_MEMBER',
            action: isSos ? 'TRIGGER_SOS_EMERGENCY' : 'CREATE_INCIDENT',
            entity: 'Incident',
            entityId: incident.id,
            reason: `Logged emergency event ${incident.incidentCode} (${incident.title})`,
        });
        return incident;
    }
    static async triggerSos(expeditionId, data, user) {
        return this.createIncident(expeditionId, {
            ...data,
            type: 'SOS Beacon',
            title: `SOS: Immediate Polar Rescue Beacon - ${data.location || 'Field Traverse'}`,
            severity: 'CRITICAL',
            isSosEmergency: true,
            description: data.message || 'EMERGENCY SOS SIGNAL ACTIVATED. Operator reported critical life-safety distress. Polar SAR protocol initiated.',
            requiredSupport: 'Search and Rescue (SAR) Airborne Evacuation',
        }, user);
    }
    static async dispatchResponse(id, user) {
        const incident = await prisma.incident.findUnique({
            where: { id },
            include: { assignedPersonnel: true, assignedAsset: true, targetStation: true },
        });
        if (!incident)
            throw new Error(`Incident ${id} not found`);
        const updated = await prisma.incident.update({
            where: { id },
            data: { status: 'Dispatched' },
        });
        // Create ActionItem
        await prisma.actionItem.create({
            data: {
                expeditionId: incident.expeditionId,
                actionType: 'Dispatch',
                title: `Dispatched Emergency Team for ${incident.incidentCode}`,
                description: `Dispatched ${incident.assignedAsset?.name || 'Vehicle'} with ${incident.assignedPersonnel?.name || 'Responder'} from ${incident.targetStation?.name || 'Base Station'} to ${incident.location}.`,
                assignedTo: incident.assignedPersonnel?.name || 'Field Rescue Team',
                targetStationId: incident.targetStationId,
                assignedPersonnelId: incident.assignedPersonnelId,
                assignedAssetId: incident.assignedAssetId,
                status: 'In Progress',
                executedAt: new Date(),
            },
        });
        // Update responder personnel emergency availability to 'En Route'
        if (incident.assignedPersonnelId) {
            await prisma.personnel.update({
                where: { id: incident.assignedPersonnelId },
                data: { emergencyAvailability: 'En Route', status: 'In Transit' },
            });
        }
        await AuditService.record({
            expeditionId: incident.expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'DISPATCH_INCIDENT_RESPONSE',
            entity: 'Incident',
            entityId: id,
            reason: `Authorized emergency rescue response dispatch for ${incident.incidentCode}`,
        });
        return updated;
    }
    static async resolveIncident(id, payload, user) {
        const incident = await prisma.incident.findUnique({
            where: { id },
            include: { assignedPersonnel: true, assignedAsset: true },
        });
        if (!incident)
            throw new Error(`Incident ${id} not found`);
        const updated = await prisma.incident.update({
            where: { id },
            data: {
                status: 'Resolved',
                resolvedAt: new Date(),
                resolutionNotes: payload.resolutionNotes || 'Incident safely mitigated and operational status restored.',
            },
        });
        // Free up responder personnel if assigned
        if (incident.assignedPersonnelId) {
            await prisma.personnel.update({
                where: { id: incident.assignedPersonnelId },
                data: { emergencyAvailability: 'Available', status: 'At Station' },
            });
        }
        // Resolve linked alerts
        await prisma.alert.updateMany({
            where: {
                expeditionId: incident.expeditionId,
                status: { in: ['ACTIVE', 'IN_PROGRESS'] },
                affectedEntity: incident.location,
            },
            data: { status: 'RESOLVED' },
        });
        await RiskService.calculateAndRecordExpeditionRisk(incident.expeditionId);
        await AlertService.evaluateAndSyncAlerts(incident.expeditionId);
        await AuditService.record({
            expeditionId: incident.expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'RESOLVE_INCIDENT',
            entity: 'Incident',
            entityId: id,
            previousState: incident.status,
            newState: 'Resolved',
            reason: `Closed incident ${incident.incidentCode}: ${payload.resolutionNotes || 'Operational risk resolved.'}`,
        });
        return updated;
    }
}

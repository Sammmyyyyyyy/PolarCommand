import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
import { eventBus } from '../events/eventBus.js';

export class IncidentService {
  public static async listIncidents(expeditionId: string, status?: string) {
    const where: any = { expeditionId };
    if (status && status !== 'All') where.status = status;

    return prisma.incident.findMany({
      where,
      include: {
        targetStation: true,
        assignedPersonnel: true,
        assignedAsset: true,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  public static async getIncident(id: string) {
    return prisma.incident.findUnique({
      where: { id },
      include: {
        targetStation: true,
        assignedPersonnel: true,
        assignedAsset: true,
      },
    });
  }

  public static async createIncident(expeditionId: string, data: any, user?: any) {
    const expedition = await prisma.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        stations: true,
        personnel: true,
        assets: true,
      },
    });

    if (!expedition) throw new Error(`Expedition ${expeditionId} not found`);

    // Determine nearest station from location name or default
    const locationLower = (data.location || '').toLowerCase();
    const nearestStation =
      expedition.stations.find((s) => locationLower.includes(s.name.toLowerCase()) || locationLower.includes(s.code.toLowerCase())) ||
      expedition.stations[0] ||
      null;

    // Find nearest qualified personnel (Doctor if medical, Engineer if vehicle, or available personnel)
    const isMedical = data.type === 'Medical Emergency' || data.type === 'Missing Personnel';
    const qualifiedPersonnel =
      expedition.personnel.find((p) =>
        isMedical
          ? p.role.toLowerCase().includes('doctor') && p.emergencyAvailability !== 'Active'
          : p.role.toLowerCase().includes('engineer') || p.role.toLowerCase().includes('tech')
      ) ||
      expedition.personnel.find((p) => p.emergencyAvailability === 'Available') ||
      expedition.personnel[0];

    // Find available vehicle
    const availableVehicle =
      expedition.assets.find(
        (a) => a.type.toLowerCase().includes('vehicle') && (a.status === 'Operational' || a.status === 'Standby')
      ) || expedition.assets[0];

    const incidentCode = `INC-${Date.now().toString().slice(-4)}`;

    const responsePlan = {
      nearestStationName: nearestStation?.name || 'Bharati Station',
      nearestVehicleName: availableVehicle ? `${availableVehicle.name} (${availableVehicle.assetCode})` : 'Rescue Spec Snowcat',
      nearestPersonnelName: qualifiedPersonnel ? `${qualifiedPersonnel.name} (${qualifiedPersonnel.role})` : 'Lead Medical Officer',
      etaMinutes: 38,
      recommendedSteps: [
        `Mobilize ${availableVehicle ? availableVehicle.name : 'Emergency Vehicle'} from ${nearestStation?.name || 'Base'}`,
        `Assign ${qualifiedPersonnel ? qualifiedPersonnel.name : 'Officer'} to on-ice triage response`,
        'Establish VHF simplex relay and satellite locator tracking',
        'Prepare emergency survival shelter and medical stabilization kit',
      ],
    };

    const incident = await prisma.incident.create({
      data: {
        expeditionId,
        incidentCode,
        type: data.type || 'Vehicle Breakdown',
        title: data.title || `${data.type} Alert at ${data.location || 'Field Zone'}`,
        location: data.location || '15 km from Station',
        latitude: data.latitude ? Number(data.latitude) : -69.42,
        longitude: data.longitude ? Number(data.longitude) : 76.22,
        severity: data.severity || 'HIGH',
        peopleAffected: Number(data.peopleAffected) || 1,
        description: data.description || 'Emergency field incident reported. Rapid response required.',
        requiredSupport: data.requiredSupport || 'Medical & Mechanical Dispatch',
        status: 'In Progress',
        targetStationId: nearestStation?.id || null,
        assignedPersonnelId: qualifiedPersonnel?.id || null,
        assignedAssetId: availableVehicle?.id || null,
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
        title: `EMERGENCY: ${incident.title}`,
        source: 'Incident Response Dispatcher',
        affectedEntity: incident.location,
        reason: incident.description,
        impact: `${incident.peopleAffected} personnel impacted; operational dispatch required.`,
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
      userName: user?.name,
      userRole: user?.role,
      action: 'CREATE_INCIDENT',
      entity: 'Incident',
      entityId: incident.id,
      reason: `Logged emergency event ${incident.incidentCode} (${incident.title})`,
    });

    return incident;
  }

  public static async dispatchResponse(id: string, user?: any) {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { assignedPersonnel: true, assignedAsset: true, targetStation: true },
    });

    if (!incident) throw new Error(`Incident ${id} not found`);

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
}

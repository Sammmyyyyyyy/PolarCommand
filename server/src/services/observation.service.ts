import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { AlertService } from './alert.service.js';
import { RiskService } from './risk.service.js';

export interface CreateObservationInput {
  expeditionId: string;
  stationId?: string;
  location?: string;
  category: 'ENVIRONMENT' | 'EQUIPMENT' | 'SAFETY' | 'CARGO' | 'INFRASTRUCTURE' | 'PERSONNEL' | 'ROUTE' | 'OTHER';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  relatedTaskId?: string;
  relatedAssetId?: string;
  user?: any;
}

export class ObservationService {
  public static async listObservations(expeditionId: string, category?: string, severity?: string) {
    const where: any = { expeditionId };
    if (category && category !== 'ALL') where.category = category;
    if (severity && severity !== 'ALL') where.severity = severity;

    return prisma.fieldObservation.findMany({
      where,
      include: {
        submittedBy: { select: { id: true, name: true, role: true, email: true } },
        station: true,
        relatedTask: true,
        relatedAsset: true,
        linkedIncident: true,
        linkedAlert: true,
        attachments: true,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  public static async createObservation(inputOrExpId: any, maybeData?: any, maybeUser?: any) {
    const input: CreateObservationInput = typeof inputOrExpId === 'string'
      ? {
          expeditionId: inputOrExpId,
          category: maybeData?.category || 'OTHER',
          severity: maybeData?.severity || 'LOW',
          description: maybeData?.description || '',
          location: maybeData?.location,
          stationId: maybeData?.stationId,
          relatedTaskId: maybeData?.relatedTaskId,
          relatedAssetId: maybeData?.relatedAssetId,
          attachmentPath: maybeData?.attachmentPath,
          user: maybeUser,
        }
      : inputOrExpId;

    const submitterName = input.user?.name || 'Field Operator';
    const submittedById = input.user?.id || null;

    let linkedAlertId: string | null = null;

    // If observation has HIGH or CRITICAL severity, generate an alert
    if (input.severity === 'HIGH' || input.severity === 'CRITICAL') {
      const alert = await prisma.alert.create({
        data: {
          expeditionId: input.expeditionId,
          severity: input.severity,
          title: `Field Observation Alert: ${input.category}`,
          source: 'FIELD_OBSERVATION',
          affectedEntity: input.location || 'Field Sector',
          reason: input.description,
          impact: `Field condition reported as ${input.severity} severity by ${submitterName}`,
          recommendedAction: `Deploy inspection team or evaluate operational stop for category ${input.category}`,
          status: 'ACTIVE',
        },
      });
      linkedAlertId = alert.id;
    }

    const observation = await prisma.fieldObservation.create({
      data: {
        expeditionId: input.expeditionId,
        stationId: input.stationId || null,
        location: input.location || null,
        submittedById,
        submitterName,
        category: input.category,
        description: input.description,
        severity: input.severity,
        relatedTaskId: input.relatedTaskId || null,
        relatedAssetId: input.relatedAssetId || null,
        linkedAlertId,
      },
      include: {
        station: true,
        relatedTask: true,
        relatedAsset: true,
        linkedAlert: true,
      },
    });

    console.log(`[DOMAIN EVENT: ObservationCreated] {"expeditionId":"${input.expeditionId}","observationId":"${observation.id}","category":"${input.category}","severity":"${input.severity}"}`);

    if (input.severity === 'HIGH' || input.severity === 'CRITICAL') {
      await RiskService.calculateAndRecordExpeditionRisk(input.expeditionId);
    }

    await AuditService.record({
      expeditionId: input.expeditionId,
      userId: submittedById,
      userName: submitterName,
      userRole: input.user?.role || 'FIELD_MEMBER',
      action: 'CREATE_FIELD_OBSERVATION',
      entity: 'FieldObservation',
      entityId: observation.id,
      reason: `Field observation [${input.category}] (${input.severity}): ${input.description.slice(0, 100)}`,
    });

    return observation;
  }
}

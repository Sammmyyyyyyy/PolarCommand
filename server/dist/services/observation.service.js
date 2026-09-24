import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
export class ObservationService {
    static async listObservations(expeditionId, category, severity) {
        const where = { expeditionId };
        if (category && category !== 'ALL')
            where.category = category;
        if (severity && severity !== 'ALL')
            where.severity = severity;
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
    static async createObservation(inputOrExpId, maybeData, maybeUser) {
        const input = typeof inputOrExpId === 'string'
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
        let linkedAlertId = null;
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

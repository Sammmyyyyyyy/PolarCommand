import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
export class DocumentService {
    static async listDocuments(expeditionId, entityType, entityId) {
        const where = { expeditionId };
        if (entityType)
            where.entityType = entityType;
        if (entityId)
            where.entityId = entityId;
        return prisma.operationalDocument.findMany({
            where,
            include: {
                uploadedBy: { select: { id: true, name: true, role: true, email: true } },
            },
            orderBy: { timestamp: 'desc' },
        });
    }
    static async attachDocument(input) {
        const uploadedByName = input.user?.name || 'Operations Specialist';
        const uploadedById = input.user?.id || null;
        const doc = await prisma.operationalDocument.create({
            data: {
                expeditionId: input.expeditionId,
                entityType: input.entityType,
                entityId: input.entityId,
                fileName: input.fileName,
                fileType: input.fileType || 'REPORT',
                fileSize: input.fileSize || 1024,
                fileUrl: input.fileUrl || `/attachments/${encodeURIComponent(input.fileName)}`,
                uploadedById,
                uploadedByName,
                observationId: input.observationId || null,
            },
        });
        await AuditService.record({
            expeditionId: input.expeditionId,
            userId: uploadedById,
            userName: uploadedByName,
            userRole: input.user?.role || 'LOGISTICS_OFFICER',
            action: 'ATTACH_DOCUMENT',
            entity: 'OperationalDocument',
            entityId: doc.id,
            reason: `Uploaded ${doc.fileType} document '${doc.fileName}' attached to ${input.entityType} (${input.entityId})`,
        });
        return doc;
    }
}

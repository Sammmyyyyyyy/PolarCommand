import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';

export interface CreateDocumentInput {
  expeditionId: string;
  entityType: 'EXPEDITION' | 'TASK' | 'INCIDENT' | 'CARGO' | 'ASSET' | 'STATION' | 'FIELD_OBSERVATION' | 'MOVEMENT';
  entityId: string;
  fileName: string;
  fileType: string; // PDF, MANIFEST, REPORT, LOG, IMAGE, CSV
  fileSize?: number;
  fileUrl?: string;
  observationId?: string;
  user?: any;
}

export class DocumentService {
  public static async listDocuments(expeditionId: string, entityType?: string, entityId?: string) {
    const where: any = { expeditionId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    return prisma.operationalDocument.findMany({
      where,
      include: {
        uploadedBy: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  public static async attachDocument(input: CreateDocumentInput) {
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

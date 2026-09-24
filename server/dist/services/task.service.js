import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { RiskService } from './risk.service.js';
import { AlertService } from './alert.service.js';
export class TaskService {
    static async listTasks(expeditionId, filter) {
        const where = { expeditionId };
        if (filter?.status && filter.status !== 'All')
            where.status = filter.status;
        if (filter?.priority && filter.priority !== 'All')
            where.priority = filter.priority;
        const pId = filter?.assignedPersonnelId || filter?.personnelId;
        if (pId)
            where.assignedPersonnelId = pId;
        if (filter?.stationId)
            where.stationId = filter.stationId;
        return prisma.task.findMany({
            where,
            include: {
                station: true,
                assignedPersonnel: true,
                assignedUser: { select: { id: true, name: true, email: true, role: true } },
                requiredAsset: true,
            },
            orderBy: [
                { priority: 'asc' },
                { dueTime: 'asc' },
                { createdAt: 'desc' },
            ],
        });
    }
    static async getTask(taskId) {
        return prisma.task.findUnique({
            where: { id: taskId },
            include: {
                station: true,
                assignedPersonnel: true,
                assignedUser: { select: { id: true, name: true, email: true, role: true } },
                requiredAsset: true,
            },
        });
    }
    static async createTask(expeditionId, data, user) {
        const task = await prisma.task.create({
            data: {
                expeditionId,
                title: data.title,
                description: data.description || '',
                stationId: data.stationId || null,
                location: data.location || null,
                assignedPersonnelId: data.assignedPersonnelId || null,
                assignedUserId: data.assignedUserId || null,
                priority: data.priority || 'MEDIUM',
                status: data.status || (data.assignedPersonnelId ? 'ASSIGNED' : 'PENDING'),
                startTime: data.startTime ? new Date(data.startTime) : new Date(),
                dueTime: data.dueTime ? new Date(data.dueTime) : new Date(Date.now() + 86400000 * 3),
                dependencies: data.dependencies ? (typeof data.dependencies === 'string' ? data.dependencies : JSON.stringify(data.dependencies)) : null,
                requiredAssetId: data.requiredAssetId || null,
                requiredCargo: data.requiredCargo || null,
                notes: data.notes || null,
            },
            include: {
                station: true,
                assignedPersonnel: true,
                requiredAsset: true,
            },
        });
        // If required asset was assigned, update asset status to ASSIGNED/IN_USE
        if (task.requiredAssetId) {
            await prisma.asset.update({
                where: { id: task.requiredAssetId },
                data: { status: 'In Use', lifecycleStatus: 'IN_USE' },
            });
        }
        await AuditService.record({
            expeditionId,
            userId: user?.id,
            userName: user?.name || 'Mission Commander',
            userRole: user?.role || 'COMMANDER',
            action: 'CREATE_TASK',
            entity: 'Task',
            entityId: task.id,
            reason: `Assigned mission task: "${task.title}" [Priority: ${task.priority}] to ${task.assignedPersonnel?.name || 'Unassigned'}`,
        });
        await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
        await AlertService.evaluateAndSyncAlerts(expeditionId);
        return task;
    }
    static async updateTask(taskId, data, user) {
        const prev = await prisma.task.findUnique({ where: { id: taskId } });
        if (!prev)
            throw new Error(`Task ${taskId} not found`);
        const updateData = { ...data };
        if (data.startTime)
            updateData.startTime = new Date(data.startTime);
        if (data.dueTime)
            updateData.dueTime = new Date(data.dueTime);
        if (data.completionTime)
            updateData.completionTime = new Date(data.completionTime);
        const updated = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                station: true,
                assignedPersonnel: true,
                requiredAsset: true,
            },
        });
        await AuditService.record({
            expeditionId: prev.expeditionId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'UPDATE_TASK',
            entity: 'Task',
            entityId: taskId,
            previousState: prev.status,
            newState: updated.status,
            reason: `Updated task parameters for "${updated.title}"`,
        });
        await RiskService.calculateAndRecordExpeditionRisk(prev.expeditionId);
        await AlertService.evaluateAndSyncAlerts(prev.expeditionId);
        return updated;
    }
    static async updateTaskStatus(taskId, status, options, user) {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { assignedPersonnel: true, requiredAsset: true },
        });
        if (!task)
            throw new Error(`Task ${taskId} not found`);
        const data = { status };
        if (options?.notes)
            data.notes = options.notes;
        if (options?.fieldObservations)
            data.fieldObservations = options.fieldObservations;
        if (status === 'COMPLETED') {
            data.completionTime = new Date();
            // Free up assigned asset
            if (task.requiredAssetId) {
                await prisma.asset.update({
                    where: { id: task.requiredAssetId },
                    data: { status: 'Operational', lifecycleStatus: 'AVAILABLE' },
                });
            }
        }
        else if (status === 'IN_PROGRESS') {
            if (!task.startTime)
                data.startTime = new Date();
        }
        const updated = await prisma.task.update({
            where: { id: taskId },
            data,
            include: {
                station: true,
                assignedPersonnel: true,
                requiredAsset: true,
            },
        });
        await AuditService.record({
            expeditionId: task.expeditionId,
            userId: user?.id,
            userName: user?.name || task.assignedPersonnel?.name || 'Field Operator',
            userRole: user?.role || 'FIELD_MEMBER',
            action: 'UPDATE_TASK_STATUS',
            entity: 'Task',
            entityId: taskId,
            previousState: task.status,
            newState: status,
            reason: `Changed task status to ${status}${options?.fieldObservations ? ` (Observation: ${options.fieldObservations.slice(0, 50)}...)` : ''}`,
        });
        // Check if task is blocked or overdue and raise alert if so
        if (status === 'BLOCKED') {
            await prisma.alert.create({
                data: {
                    expeditionId: task.expeditionId,
                    severity: task.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                    title: `TASK BLOCKED: ${task.title}`,
                    source: 'Task / Mission Control',
                    affectedEntity: task.location || task.title,
                    reason: options?.fieldObservations || options?.notes || 'Operational hindrance reported by field member',
                    impact: `Mission task execution stalled; resolution required.`,
                    recommendedAction: `Inspect impediment and reassign backup assets or personnel.`,
                    status: 'ACTIVE',
                },
            });
        }
        await RiskService.calculateAndRecordExpeditionRisk(task.expeditionId);
        await AlertService.evaluateAndSyncAlerts(task.expeditionId);
        return updated;
    }
}

import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
export class OrganizationService {
    static async listOrganizations() {
        return prisma.organization.findMany({
            include: {
                _count: {
                    select: {
                        expeditions: true,
                        users: true,
                        stations: true,
                        assets: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    static async getOrganization(id) {
        return prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, email: true, name: true, role: true, stationId: true },
                },
                expeditions: {
                    include: {
                        commander: { select: { id: true, name: true, email: true } },
                        _count: { select: { stations: true, personnel: true, cargo: true, assets: true, tasks: true } },
                    },
                    orderBy: { startDate: 'desc' },
                },
                stations: true,
                assets: true,
            },
        });
    }
    static async createOrganization(data, user) {
        const org = await prisma.organization.create({
            data: {
                name: data.name,
                code: data.code || `ORG-${Date.now().toString().slice(-4)}`,
                description: data.description || 'Polar Operations Organization',
            },
        });
        await AuditService.record({
            userId: user?.id,
            userName: user?.name || 'System Admin',
            userRole: user?.role || 'ADMIN',
            action: 'CREATE_ORGANIZATION',
            entity: 'Organization',
            entityId: org.id,
            reason: `Commissioned organization ${org.name} (${org.code})`,
        });
        return org;
    }
    static async getOrCreateDefaultOrganization() {
        let org = await prisma.organization.findFirst({
            where: { code: 'PRO-GLOBAL' },
        });
        if (!org) {
            org = await prisma.organization.create({
                data: {
                    code: 'PRO-GLOBAL',
                    name: 'Polar Research Operations',
                    description: 'Global polar expedition authority & scientific logistics consortium.',
                },
            });
        }
        return org;
    }
    /**
     * Section 9: Organization Administrator Management Experience.
     * Answers: "Who is available?", "Which assets are available?", "Which expeditions are active?",
     * "Where are resources committed?", "Which expeditions are not ready?"
     */
    static async getOrganizationOverview(organizationId) {
        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                users: { select: { id: true, name: true, email: true, role: true } },
                expeditions: {
                    include: {
                        commander: { select: { id: true, name: true, email: true } },
                        stations: true,
                        personnel: true,
                        assets: true,
                        cargo: true,
                        inventory: true,
                        tasks: true,
                    },
                    orderBy: { startDate: 'desc' },
                },
                stations: true,
                assets: true,
            },
        });
        if (!org)
            throw new Error(`Organization ${organizationId} not found`);
        // Aggregate personnel pool across all expeditions and unassigned
        const allPersonnel = await prisma.personnel.findMany({
            where: { expedition: { organizationId } },
            include: { expedition: { select: { id: true, code: true, title: true, lifecycleStatus: true } } },
        });
        const totalPersonnel = allPersonnel.length;
        const overdueCheckIns = allPersonnel.filter((p) => p.isCheckInOverdue).length;
        const personnelInDistress = allPersonnel.filter((p) => p.checkInStatus === 'EMERGENCY' || p.checkInStatus === 'MISSING').length;
        const deployedPersonnel = allPersonnel.filter((p) => p.expedition.lifecycleStatus === 'ACTIVE').length;
        const availablePersonnel = totalPersonnel - deployedPersonnel;
        // Aggregate asset pool
        const allAssets = await prisma.asset.findMany({
            where: {
                OR: [{ organizationId }, { expedition: { organizationId } }],
            },
            include: {
                station: { select: { id: true, name: true } },
                expedition: { select: { id: true, code: true, title: true, lifecycleStatus: true } },
            },
        });
        const totalAssets = allAssets.length;
        const availableAssets = allAssets.filter((a) => a.lifecycleStatus === 'AVAILABLE').length;
        const inUseAssets = allAssets.filter((a) => a.lifecycleStatus === 'IN_USE' || a.lifecycleStatus === 'ASSIGNED').length;
        const maintenanceDueAssets = allAssets.filter((a) => a.lifecycleStatus === 'MAINTENANCE_DUE' || a.lifecycleStatus === 'UNDER_MAINTENANCE' || a.maintenanceInterval - a.operatingHours <= 0).length;
        const failedAssets = allAssets.filter((a) => a.lifecycleStatus === 'FAILED' || a.status === 'Critical').length;
        // Recent audit logs
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                OR: [
                    { expedition: { organizationId } },
                    { user: { organizationId } },
                ],
            },
            orderBy: { timestamp: 'desc' },
            take: 15,
        });
        return {
            organization: {
                id: org.id,
                code: org.code,
                name: org.name,
                description: org.description,
                totalUsers: org.users.length,
            },
            users: org.users,
            expeditionsSummary: org.expeditions.map((e) => ({
                id: e.id,
                code: e.code,
                title: e.title,
                status: e.status,
                lifecycleStatus: e.lifecycleStatus,
                overallRiskScore: e.overallRiskScore,
                commanderName: e.commander?.name || e.commanderName || 'Unassigned',
                crewCount: e.personnel.length,
                stationCount: e.stations.length,
                assetCount: e.assets.length,
                cargoCount: e.cargo.length,
                taskCount: e.tasks.length,
                startDate: e.startDate,
                endDate: e.endDate,
            })),
            personnelPool: {
                total: totalPersonnel,
                available: Math.max(0, availablePersonnel),
                deployed: deployedPersonnel,
                overdueCheckIns,
                personnelInDistress,
                members: allPersonnel.map((p) => ({
                    id: p.id,
                    name: p.name,
                    role: p.role,
                    qualification: p.qualification,
                    status: p.status,
                    checkInStatus: p.checkInStatus,
                    isCheckInOverdue: p.isCheckInOverdue,
                    currentLocation: p.currentLocation,
                    assignedExpedition: p.expedition.code,
                    expeditionLifecycle: p.expedition.lifecycleStatus,
                })),
            },
            assetPool: {
                total: totalAssets,
                available: availableAssets,
                inUse: inUseAssets,
                maintenanceDue: maintenanceDueAssets,
                failed: failedAssets,
                assets: allAssets.map((a) => ({
                    id: a.id,
                    assetCode: a.assetCode,
                    name: a.name,
                    type: a.type,
                    lifecycleStatus: a.lifecycleStatus,
                    status: a.status,
                    stationName: a.station?.name || 'In Transit',
                    operatingHours: a.operatingHours,
                    maintenanceInterval: a.maintenanceInterval,
                    assignedExpedition: a.expedition?.code || 'None',
                })),
            },
            recentAuditLogs: auditLogs,
        };
    }
}

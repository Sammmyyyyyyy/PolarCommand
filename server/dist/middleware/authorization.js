export function normalizeRole(rawRole) {
    if (!rawRole)
        return 'TEAM_MEMBER';
    const upper = rawRole.toUpperCase().trim();
    if (upper === 'ADMIN')
        return 'ADMIN';
    if (upper === 'STATION_MANAGER' || upper === 'STATION')
        return 'STATION_MANAGER';
    if (upper === 'EXPEDITION_LEADER' || upper === 'COMMANDER' || upper === 'LEADER')
        return 'EXPEDITION_LEADER';
    if (upper === 'LOGISTICS_COMMANDER' || upper === 'LOGISTICS_OFFICER' || upper === 'LOGISTICS')
        return 'LOGISTICS_COMMANDER';
    if (upper === 'TEAM_MEMBER' || upper === 'FIELD_MEMBER' || upper === 'MEMBER' || upper === 'VIEWER')
        return 'TEAM_MEMBER';
    return 'TEAM_MEMBER';
}
export const ROLE_PERMISSIONS = {
    ADMIN: [
        'expedition:create',
        'expedition:read',
        'expedition:update',
        'expedition:delete',
        'station:read',
        'station:manage',
        'inventory:read',
        'inventory:manage',
        'inventory:request_restock',
        'cargo:read',
        'cargo:create',
        'cargo:manage',
        'personnel:read',
        'personnel:manage',
        'equipment:read',
        'equipment:assign',
        'tracking:read',
        'tracking:view_team',
        'incident:create',
        'incident:manage',
        'simulation:run',
        'user:manage',
        'audit:read',
    ],
    LOGISTICS_COMMANDER: [
        'expedition:read',
        'station:read',
        'inventory:read',
        'inventory:manage',
        'inventory:request_restock',
        'cargo:read',
        'cargo:create',
        'cargo:manage',
        'equipment:read',
        'tracking:read',
        'simulation:run',
        'audit:read',
    ],
    STATION_MANAGER: [
        'expedition:read',
        'station:read',
        'station:manage',
        'inventory:read',
        'inventory:manage',
        'inventory:request_restock',
        'cargo:read',
        'personnel:read',
        'equipment:read',
        'tracking:read',
        'incident:create',
        'incident:manage',
        'simulation:run',
    ],
    EXPEDITION_LEADER: [
        'expedition:read',
        'expedition:update',
        'station:read',
        'inventory:read',
        'cargo:read',
        'personnel:read',
        'personnel:manage',
        'equipment:read',
        'equipment:assign',
        'tracking:read',
        'tracking:view_team',
        'incident:create',
        'incident:manage',
        'simulation:run',
    ],
    TEAM_MEMBER: [
        'expedition:read',
        'personnel:read',
        'equipment:read',
        'tracking:view_team',
        'incident:create',
    ],
};
export function hasPermission(rawRole, permission) {
    const role = normalizeRole(rawRole);
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
}
export function getRolePermissions(rawRole) {
    const role = normalizeRole(rawRole);
    return ROLE_PERMISSIONS[role] || [];
}
/**
 * Middleware: Enforces that the user has a specific permission.
 * Backend is the source of truth for authorization.
 */
export function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: Authentication required' });
        }
        const userRole = normalizeRole(req.user.role);
        if (!hasPermission(userRole, permission)) {
            return res.status(403).json({
                error: `Forbidden: Access denied. Missing required permission: ${permission}`,
                requiredPermission: permission,
                role: userRole,
            });
        }
        next();
    };
}
/**
 * Middleware: Resource scoping enforcement.
 * - Station Manager: Scoped to their stationId
 * - Expedition Leader / Team Member: Scoped to their assignedExpeditionId
 * - Admin: Global unrestricted access
 */
export function enforceResourceScope(scopeType) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: Authentication required' });
        }
        const userRole = normalizeRole(req.user.role);
        if (userRole === 'ADMIN') {
            return next(); // Admin has unrestricted global scope
        }
        if (scopeType === 'station') {
            const targetStationId = req.params.stationId || req.body.stationId || req.query.stationId;
            if (userRole === 'STATION_MANAGER') {
                if (req.user.stationId && targetStationId && req.user.stationId !== targetStationId) {
                    return res.status(403).json({
                        error: `Forbidden: Station Manager can only manage resources within their assigned station.`,
                        assignedStationId: req.user.stationId,
                        requestedStationId: targetStationId,
                    });
                }
            }
        }
        if (scopeType === 'expedition') {
            const targetExpeditionId = req.params.expeditionId || req.params.id || req.body.expeditionId || req.query.expeditionId;
            if (userRole === 'EXPEDITION_LEADER' || userRole === 'TEAM_MEMBER') {
                if (req.user.assignedExpeditionId && targetExpeditionId && req.user.assignedExpeditionId !== targetExpeditionId) {
                    return res.status(403).json({
                        error: `Forbidden: You can only access operations within your assigned expedition.`,
                        assignedExpeditionId: req.user.assignedExpeditionId,
                        requestedExpeditionId: targetExpeditionId,
                    });
                }
            }
        }
        next();
    };
}

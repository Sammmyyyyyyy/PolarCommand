import { prisma } from '../config/database.js';
import { normalizeRole, getRolePermissions, Permission } from '../middleware/authorization.js';

export interface UserScope {
  userId: string;
  role: 'ADMIN' | 'STATION_MANAGER' | 'EXPEDITION_LEADER' | 'TEAM_MEMBER' | 'LOGISTICS_COMMANDER';
  isAdmin: boolean;
  isGlobalAdmin: boolean;
  isStationManager: boolean;
  isExpeditionLeader: boolean;
  isTeamMember: boolean;
  isLogisticsCommander: boolean;
  stationIds: string[];
  expeditionIds: string[];
  teamLeaderId: string | null;
  permissions: Permission[];
  primaryStationId: string | null;
  primaryExpeditionId: string | null;
}

export class ScopeService {
  /**
   * Central User Scope Resolver
   * Takes a raw user object (from JWT token or DB) and resolves authoritative scope
   */
  public static async getUserScope(rawUser: any): Promise<UserScope> {
    if (!rawUser) {
      return {
        userId: '',
        role: 'TEAM_MEMBER',
        isAdmin: false,
        isGlobalAdmin: false,
        isStationManager: false,
        isExpeditionLeader: false,
        isTeamMember: true,
        isLogisticsCommander: false,
        stationIds: [],
        expeditionIds: [],
        teamLeaderId: null,
        permissions: [],
        primaryStationId: null,
        primaryExpeditionId: null,
      };
    }

    const userId = rawUser.id || rawUser.userId;
    const role = normalizeRole(rawUser.role);
    const permissions = getRolePermissions(role);

    // Fetch live user record if available to get up-to-date assignment IDs
    let dbUser: any = null;
    if (userId) {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          assignedPersonnel: true,
        },
      });
    }

    const user = dbUser || rawUser;

    // Parse station IDs
    const stationIdSet = new Set<string>();
    if (user.stationId) stationIdSet.add(user.stationId);
    if (user.assignedPersonnel?.assignedStationId) stationIdSet.add(user.assignedPersonnel.assignedStationId);
    if (user.stationIdsJson) {
      try {
        const arr = JSON.parse(user.stationIdsJson);
        if (Array.isArray(arr)) arr.forEach((id: string) => stationIdSet.add(id));
      } catch {}
    }
    if (user.assignedPersonnel?.stationIdsJson) {
      try {
        const arr = JSON.parse(user.assignedPersonnel.stationIdsJson);
        if (Array.isArray(arr)) arr.forEach((id: string) => stationIdSet.add(id));
      } catch {}
    }

    // Parse expedition IDs
    const expeditionIdSet = new Set<string>();
    if (user.assignedExpeditionId) expeditionIdSet.add(user.assignedExpeditionId);
    if (user.assignedPersonnel?.expeditionId) expeditionIdSet.add(user.assignedPersonnel.expeditionId);
    if (user.expeditionIdsJson) {
      try {
        const arr = JSON.parse(user.expeditionIdsJson);
        if (Array.isArray(arr)) arr.forEach((id: string) => expeditionIdSet.add(id));
      } catch {}
    }
    if (user.assignedPersonnel?.expeditionIdsJson) {
      try {
        const arr = JSON.parse(user.assignedPersonnel.expeditionIdsJson);
        if (Array.isArray(arr)) arr.forEach((id: string) => expeditionIdSet.add(id));
      } catch {}
    }

    const teamLeaderId = user.teamLeaderId || user.assignedPersonnel?.teamLeaderId || null;

    // Additional role-based relationship resolutions:
    // If Station Manager, also resolve all expeditions linked to their assigned station(s)
    if (role === 'STATION_MANAGER') {
      const assignedStations = Array.from(stationIdSet);
      for (const sId of assignedStations) {
        const st = await prisma.station.findUnique({ where: { id: sId } });
        if (st) {
          if (st.expeditionId) expeditionIdSet.add(st.expeditionId);
          if (st.expeditionIdsJson) {
            try {
              const arr = JSON.parse(st.expeditionIdsJson);
              if (Array.isArray(arr)) arr.forEach((id: string) => expeditionIdSet.add(id));
            } catch {}
          }
        }
      }
      // Also find expeditions that declare this station in stationIdsJson
      const linkedExpeditions = await prisma.expedition.findMany({
        select: { id: true, stationIdsJson: true },
      });
      for (const exp of linkedExpeditions) {
        if (exp.stationIdsJson) {
          try {
            const arr = JSON.parse(exp.stationIdsJson);
            if (Array.isArray(arr) && arr.some((id: string) => stationIdSet.has(id))) {
              expeditionIdSet.add(exp.id);
            }
          } catch {}
        }
      }
    }

    // If Expedition Leader, also resolve stations linked to their assigned expedition(s)
    if (role === 'EXPEDITION_LEADER') {
      const assignedExpeditions = Array.from(expeditionIdSet);
      for (const eId of assignedExpeditions) {
        const exp = await prisma.expedition.findUnique({ where: { id: eId } });
        if (exp && exp.stationIdsJson) {
          try {
            const arr = JSON.parse(exp.stationIdsJson);
            if (Array.isArray(arr)) arr.forEach((id: string) => stationIdSet.add(id));
          } catch {}
        }
      }
      // Also find stations whose expeditionId or expeditionIdsJson match
      const linkedStations = await prisma.station.findMany({
        where: {
          OR: [
            { expeditionId: { in: assignedExpeditions } },
          ],
        },
        select: { id: true },
      });
      linkedStations.forEach((s) => stationIdSet.add(s.id));
    }

    const stationIds = Array.from(stationIdSet);
    const expeditionIds = Array.from(expeditionIdSet);

    return {
      userId,
      role,
      isAdmin: role === 'ADMIN',
      isGlobalAdmin: role === 'ADMIN',
      isStationManager: role === 'STATION_MANAGER',
      isExpeditionLeader: role === 'EXPEDITION_LEADER',
      isTeamMember: role === 'TEAM_MEMBER',
      isLogisticsCommander: role === 'LOGISTICS_COMMANDER',
      stationIds,
      expeditionIds,
      teamLeaderId,
      permissions,
      primaryStationId: stationIds[0] || null,
      primaryExpeditionId: expeditionIds[0] || null,
    };
  }

  /**
   * Validate if user has permission to view or manage a station
   */
  public static canAccessStation(scope: UserScope, stationId: string): boolean {
    if (scope.isAdmin || scope.isLogisticsCommander) return true;
    return scope.stationIds.includes(stationId);
  }

  /**
   * Validate if user has permission to view or manage an expedition
   */
  public static canAccessExpedition(scope: UserScope, expeditionId: string): boolean {
    if (scope.isAdmin || scope.isLogisticsCommander) return true;
    return scope.expeditionIds.includes(expeditionId);
  }
}

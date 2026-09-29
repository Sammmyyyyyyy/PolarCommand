import { User, PrimaryRole, Station, Expedition } from '../types';
import { normalizeFrontendRole } from '../context/AuthContext';

export interface UserScope {
  role: PrimaryRole;
  isGlobalAdmin: boolean;
  isStationManager: boolean;
  isExpeditionLeader: boolean;
  isTeamMember: boolean;
  isLogisticsCommander: boolean;
  stationIds: string[];
  primaryStationId: string | null;
  expeditionIds: string[];
  primaryExpeditionId: string | null;
  teamLeaderId: string | null;
  assignedPersonnelId: string | null;

  // Access checks
  canAccessStation: (stationId?: string | null) => boolean;
  canAccessExpedition: (expeditionId?: string | null, linkedStationIds?: string[]) => boolean;

  // Scoped list filters
  filterStations: <T extends { id: string; code?: string }>(stations: T[]) => T[];
  filterExpeditions: <T extends { id: string; stationIds?: string[]; stationIdsJson?: string | null; stations?: { id: string }[] }>(expeditions: T[]) => T[];
  filterPersonnel: <T extends { id?: string; assignedStationId?: string | null; expeditionId?: string | null }>(personnel: T[]) => T[];
  filterAssets: <T extends { stationId?: string | null }>(assets: T[]) => T[];
  filterInventory: <T extends { stationId?: string | null }>(items: T[]) => T[];
  filterAlerts: <T extends { stationId?: string | null; expeditionId?: string | null; recipientsJson?: string | null; createdBy?: string | null }>(alerts: T[]) => T[];
  filterRestockRequests: <T extends { stationId?: string | null; expeditionId?: string | null }>(requests: T[]) => T[];
}

export function getUserScope(currentUser: User | null): UserScope {
  const role: PrimaryRole = normalizeFrontendRole(currentUser?.role);
  const isGlobalAdmin = role === 'ADMIN';
  const isStationManager = role === 'STATION_MANAGER';
  const isExpeditionLeader = role === 'EXPEDITION_LEADER';
  const isTeamMember = role === 'TEAM_MEMBER';
  const isLogisticsCommander = role === 'LOGISTICS_COMMANDER';

  // Parse station IDs
  let stationIds: string[] = [];
  if (currentUser?.scope?.stationIds && Array.isArray(currentUser.scope.stationIds)) {
    stationIds = currentUser.scope.stationIds;
  } else if (currentUser?.stationIds && Array.isArray(currentUser.stationIds)) {
    stationIds = currentUser.stationIds;
  } else if (currentUser?.stationIdsJson) {
    try {
      stationIds = JSON.parse(currentUser.stationIdsJson);
    } catch {
      stationIds = [];
    }
  } else if (currentUser?.stationId) {
    stationIds = [currentUser.stationId];
  }

  const primaryStationId = currentUser?.scope?.primaryStationId || stationIds[0] || currentUser?.stationId || null;

  // Parse expedition IDs
  let expeditionIds: string[] = [];
  if (currentUser?.scope?.expeditionIds && Array.isArray(currentUser.scope.expeditionIds)) {
    expeditionIds = currentUser.scope.expeditionIds;
  } else if (currentUser?.expeditionIds && Array.isArray(currentUser.expeditionIds)) {
    expeditionIds = currentUser.expeditionIds;
  } else if (currentUser?.expeditionIdsJson) {
    try {
      expeditionIds = JSON.parse(currentUser.expeditionIdsJson);
    } catch {
      expeditionIds = [];
    }
  } else if (currentUser?.assignedExpeditionId) {
    expeditionIds = [currentUser.assignedExpeditionId];
  }

  const primaryExpeditionId = currentUser?.scope?.primaryExpeditionId || expeditionIds[0] || currentUser?.assignedExpeditionId || null;
  const teamLeaderId = currentUser?.scope?.teamLeaderId || currentUser?.teamLeaderId || null;
  const assignedPersonnelId = currentUser?.assignedPersonnelId || null;

  const canAccessStation = (stationId?: string | null): boolean => {
    if (isGlobalAdmin || isLogisticsCommander) return true;
    if (!stationId) return false;
    return stationIds.includes(stationId);
  };

  const canAccessExpedition = (expeditionId?: string | null, linkedStationIds?: string[]): boolean => {
    if (isGlobalAdmin || isLogisticsCommander) return true;
    if (!expeditionId) return false;
    if (expeditionIds.includes(expeditionId)) return true;
    if (isStationManager && linkedStationIds && linkedStationIds.length > 0) {
      return linkedStationIds.some((sId) => stationIds.includes(sId));
    }
    return false;
  };

  const filterStations = <T extends { id: string; code?: string }>(stations: T[]): T[] => {
    if (isGlobalAdmin || isLogisticsCommander) return stations;
    if (stationIds.length === 0) return [];
    return stations.filter((s) => stationIds.includes(s.id));
  };

  const filterExpeditions = <T extends { id: string; stationIds?: string[]; stationIdsJson?: string | null; stations?: { id: string }[] }>(
    expeditions: T[]
  ): T[] => {
    if (isGlobalAdmin || isLogisticsCommander) return expeditions;
    if (isStationManager) {
      return expeditions.filter((exp) => {
        if (expeditionIds.includes(exp.id)) return true;
        let linkedIds = exp.stationIds || [];
        if (!linkedIds.length && exp.stationIdsJson) {
          try {
            linkedIds = JSON.parse(exp.stationIdsJson);
          } catch {
            linkedIds = [];
          }
        }
        if (!linkedIds.length && exp.stations) {
          linkedIds = exp.stations.map((s) => s.id);
        }
        return linkedIds.some((sId) => stationIds.includes(sId));
      });
    }
    // Expedition Leader & Team Member
    return expeditions.filter((exp) => expeditionIds.includes(exp.id));
  };

  const filterPersonnel = <T extends { id?: string; assignedStationId?: string | null; expeditionId?: string | null }>(personnel: T[]): T[] => {
    if (isGlobalAdmin) return personnel;
    if (isStationManager) {
      return personnel.filter((p) => p.assignedStationId && stationIds.includes(p.assignedStationId));
    }
    if (isExpeditionLeader) {
      return personnel.filter((p) => p.expeditionId && expeditionIds.includes(p.expeditionId));
    }
    if (isTeamMember) {
      return personnel.filter((p) => {
        if (p.id && p.id === assignedPersonnelId) return true;
        if (p.expeditionId && expeditionIds.includes(p.expeditionId)) return true;
        if (p.assignedStationId && stationIds.includes(p.assignedStationId)) return true;
        return false;
      });
    }
    return personnel;
  };

  const filterAssets = <T extends { stationId?: string | null }>(assets: T[]): T[] => {
    if (isGlobalAdmin) return assets;
    if (isStationManager) {
      return assets.filter((a) => a.stationId && stationIds.includes(a.stationId));
    }
    if (isExpeditionLeader || isTeamMember) {
      return assets.filter((a) => a.stationId && stationIds.includes(a.stationId));
    }
    return assets;
  };

  const filterInventory = <T extends { stationId?: string | null }>(items: T[]): T[] => {
    if (isGlobalAdmin || isLogisticsCommander) return items;
    if (isStationManager) {
      return items.filter((item) => item.stationId && stationIds.includes(item.stationId));
    }
    if (isExpeditionLeader || isTeamMember) {
      return items.filter((item) => item.stationId && stationIds.includes(item.stationId));
    }
    return items;
  };

  const filterAlerts = <T extends { stationId?: string | null; expeditionId?: string | null; recipientsJson?: string | null; createdBy?: string | null }>(
    alerts: T[]
  ): T[] => {
    if (isGlobalAdmin) return alerts;
    const userId = currentUser?.id;
    return alerts.filter((alert) => {
      // Creator always sees their own alert
      if (userId && alert.createdBy === userId) return true;

      // Explicit recipient
      if (alert.recipientsJson && userId) {
        try {
          const recs: string[] = JSON.parse(alert.recipientsJson);
          if (recs.includes(userId)) return true;
        } catch {
          // ignore
        }
      }

      if (isStationManager) {
        if (alert.stationId && stationIds.includes(alert.stationId)) return true;
        if (alert.expeditionId && expeditionIds.includes(alert.expeditionId)) return true;
        return false;
      }

      if (isExpeditionLeader) {
        if (alert.expeditionId && expeditionIds.includes(alert.expeditionId)) return true;
        return false;
      }

      if (isTeamMember) {
        if (alert.expeditionId && expeditionIds.includes(alert.expeditionId)) return true;
        if (alert.stationId && stationIds.includes(alert.stationId)) return true;
        return false;
      }

      return false;
    });
  };

  const filterRestockRequests = <T extends { stationId?: string | null; expeditionId?: string | null }>(requests: T[]): T[] => {
    if (isGlobalAdmin || isLogisticsCommander) return requests;
    if (isStationManager) {
      return requests.filter((r) => r.stationId && stationIds.includes(r.stationId));
    }
    if (isExpeditionLeader) {
      return requests.filter((r) => r.expeditionId && expeditionIds.includes(r.expeditionId));
    }
    return requests.filter((r) => r.stationId && stationIds.includes(r.stationId));
  };

  return {
    role,
    isGlobalAdmin,
    isStationManager,
    isExpeditionLeader,
    isTeamMember,
    isLogisticsCommander,
    stationIds,
    primaryStationId,
    expeditionIds,
    primaryExpeditionId,
    teamLeaderId,
    assignedPersonnelId,
    canAccessStation,
    canAccessExpedition,
    filterStations,
    filterExpeditions,
    filterPersonnel,
    filterAssets,
    filterInventory,
    filterAlerts,
    filterRestockRequests,
  };
}

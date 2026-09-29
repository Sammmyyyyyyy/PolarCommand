import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Expedition, DashboardSummary } from '../types';
import { fetchDashboard } from '../services/api';
import { getExpeditionsWithRoutes } from '../services/expeditionService';
import { useAuth } from './AuthContext';
import { getUserScope } from '../utils/userScope';

interface ExpeditionContextType {
  expeditions: Expedition[];
  allExpeditions: Expedition[];
  currentExpeditionId: string | null;
  currentExpedition: Expedition | null;
  dashboard: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  canSwitchExpedition: boolean;
  switchExpedition: (id: string) => Promise<boolean>;
  triggerRefresh: () => void;
  reloadExpeditions: () => Promise<void>;
}

const ExpeditionContext = createContext<ExpeditionContextType | undefined>(undefined);

export const ExpeditionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const scope = useMemo(() => getUserScope(currentUser), [currentUser]);

  const [rawExpeditions, setRawExpeditions] = useState<Expedition[]>([]);
  const [currentExpeditionId, setCurrentExpeditionId] = useState<string | null>(() => {
    return localStorage.getItem('polar_active_expedition') || null;
  });
  const [currentExpedition, setCurrentExpedition] = useState<Expedition | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState<number>(0);

  const triggerRefresh = useCallback(() => {
    setRefreshCount((prev) => prev + 1);
  }, []);

  // Compute scoped expeditions based on authenticated user's role & assignments
  const scopedExpeditions = useMemo(() => {
    return scope.filterExpeditions(rawExpeditions);
  }, [rawExpeditions, scope]);

  const canSwitchExpedition = useMemo(() => {
    if (scope.isGlobalAdmin || scope.isLogisticsCommander) return rawExpeditions.length > 1;
    return scopedExpeditions.length > 1;
  }, [scope, rawExpeditions.length, scopedExpeditions.length]);

  const loadExpeditions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await getExpeditionsWithRoutes();
      setRawExpeditions(list);

      const scopedList = scope.filterExpeditions(list);

      // Determine active expedition ID strictly according to user scope
      let targetId: string | null = null;

      if (scope.isExpeditionLeader || scope.isTeamMember) {
        // Must automatically select assigned expedition; do not fallback to unrelated INPEX-2027
        if (scope.primaryExpeditionId && scopedList.some((e) => e.id === scope.primaryExpeditionId)) {
          targetId = scope.primaryExpeditionId;
        } else {
          targetId = scopedList[0]?.id || null;
        }
      } else if (scope.isStationManager) {
        // Station manager only sees linked expeditions
        if (currentExpeditionId && scopedList.some((e) => e.id === currentExpeditionId)) {
          targetId = currentExpeditionId;
        } else {
          targetId = scopedList[0]?.id || null;
        }
      } else {
        // Admin or Logistics Commander
        if (currentExpeditionId && list.some((e) => e.id === currentExpeditionId)) {
          targetId = currentExpeditionId;
        } else {
          const inpex = list.find((e) => e.code === 'INPEX-2027');
          targetId = inpex ? inpex.id : list[0]?.id || null;
        }
      }

      if (targetId) {
        setCurrentExpeditionId(targetId);
        localStorage.setItem('polar_active_expedition', targetId);
        const active = (list.find((e) => e.id === targetId) || null);
        setCurrentExpedition(active);

        // Fetch dashboard for active expedition
        try {
          const dash = await fetchDashboard(targetId);
          setDashboard(dash);
        } catch (dashErr) {
          console.warn('Dashboard fetch warning:', dashErr);
        }
      } else {
        setCurrentExpeditionId(null);
        setCurrentExpedition(null);
        setDashboard(null);
      }
    } catch (err: any) {
      console.error('Failed to load expeditions:', err);
      setError(err.message || 'Failed to load telemetry from server');
    } finally {
      setIsLoading(false);
    }
  }, [currentExpeditionId, scope]);

  useEffect(() => {
    loadExpeditions();
  }, [refreshCount, currentUser?.id, currentUser?.role]);

  const switchExpedition = useCallback(
    async (id: string): Promise<boolean> => {
      // Enforce scope validation
      const targetExp = rawExpeditions.find((e) => e.id === id);
      if (!targetExp) {
        console.warn(`Expedition ${id} not found.`);
        return false;
      }

      if (!scope.isGlobalAdmin && !scope.isLogisticsCommander) {
        const isAllowed = scopedExpeditions.some((e) => e.id === id);
        if (!isAllowed) {
          console.warn(`User does not have permission to switch to expedition ${id}`);
          return false;
        }
      }

      setCurrentExpeditionId(id);
      localStorage.setItem('polar_active_expedition', id);
      setCurrentExpedition(targetExp);
      setIsLoading(true);
      try {
        const dash = await fetchDashboard(id);
        setDashboard(dash);
        return true;
      } catch (err) {
        console.error('Failed to switch expedition:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [rawExpeditions, scopedExpeditions, scope]
  );

  return (
    <ExpeditionContext.Provider
      value={{
        expeditions: scopedExpeditions,
        allExpeditions: rawExpeditions,
        currentExpeditionId,
        currentExpedition,
        dashboard,
        isLoading,
        error,
        canSwitchExpedition,
        switchExpedition,
        triggerRefresh,
        reloadExpeditions: loadExpeditions,
      }}
    >
      {children}
    </ExpeditionContext.Provider>
  );
};

export const useExpedition = () => {
  const context = useContext(ExpeditionContext);
  if (!context) throw new Error('useExpedition must be used within an ExpeditionProvider');
  return context;
};

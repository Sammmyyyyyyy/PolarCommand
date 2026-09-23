import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Expedition, DashboardSummary } from '../types';
import { fetchExpeditions, fetchDashboard } from '../services/api';

interface ExpeditionContextType {
  expeditions: Expedition[];
  currentExpeditionId: string | null;
  currentExpedition: Expedition | null;
  dashboard: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  switchExpedition: (id: string) => void;
  triggerRefresh: () => void;
  reloadExpeditions: () => Promise<void>;
}

const ExpeditionContext = createContext<ExpeditionContextType | undefined>(undefined);

export const ExpeditionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [currentExpeditionId, setCurrentExpeditionId] = useState<string | null>(
    localStorage.getItem('polar_active_expedition') || null
  );
  const [currentExpedition, setCurrentExpedition] = useState<Expedition | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState<number>(0);

  const triggerRefresh = useCallback(() => {
    setRefreshCount((prev) => prev + 1);
  }, []);

  const loadExpeditions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const list = await fetchExpeditions();
      setExpeditions(list);

      // Select expedition if none or if current not in list
      let activeId = currentExpeditionId;
      if (!activeId || !list.some((e) => e.id === activeId)) {
        // Prefer INPEX-2027 if present, else first
        const inpex = list.find((e) => e.code === 'INPEX-2027');
        activeId = inpex ? inpex.id : list[0]?.id || null;
      }

      if (activeId) {
        setCurrentExpeditionId(activeId);
        localStorage.setItem('polar_active_expedition', activeId);
        const active = list.find((e) => e.id === activeId) || null;
        setCurrentExpedition(active);

        // Fetch dashboard for active expedition
        const dash = await fetchDashboard(activeId);
        setDashboard(dash);
      }
    } catch (err: any) {
      console.error('Failed to load expeditions:', err);
      setError(err.message || 'Failed to load telemetry from server');
    } finally {
      setIsLoading(false);
    }
  }, [currentExpeditionId]);

  useEffect(() => {
    loadExpeditions();
  }, [refreshCount]);

  const switchExpedition = useCallback(async (id: string) => {
    setCurrentExpeditionId(id);
    localStorage.setItem('polar_active_expedition', id);
    const exp = expeditions.find((e) => e.id === id) || null;
    setCurrentExpedition(exp);
    setIsLoading(true);
    try {
      const dash = await fetchDashboard(id);
      setDashboard(dash);
    } catch (err) {
      console.error('Failed to switch expedition:', err);
    } finally {
      setIsLoading(false);
    }
  }, [expeditions]);

  return (
    <ExpeditionContext.Provider
      value={{
        expeditions,
        currentExpeditionId,
        currentExpedition,
        dashboard,
        isLoading,
        error,
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

import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  RotateCcw,
  Zap,
  CheckCircle2,
  ChevronDown,
  CloudSnow,
  ShieldCheck,
  Plus,
  FolderOpen,
  UserCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  Compass,
  ShieldAlert,
} from 'lucide-react';
import { simulateCargoDelay, executeHeroAction, resetDemoState, updateTaskStatus, recordCheckIn, createIncident, triggerEmergencySos, fetchUnreadNotificationCount } from '../../services/api';
import { PrimaryRole } from '../../types';
import { useExpedition } from '../../context/ExpeditionContext';
import { useAuth } from '../../context/AuthContext';
import { CommandPalette } from '../common/CommandPalette';
import { NotificationDrawer } from '../common/NotificationDrawer';
import { SosEmergencyModal } from '../common/SosEmergencyModal';
import { UserRole } from '../../types';
import { OfflineSyncService, OfflineCacheState } from '../../services/offlineSync';

interface HeaderProps {
  onRefreshData?: () => void;
  activeAlertCount?: number;
  expeditionRisk?: number;
  onNavigate?: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefreshData,
  activeAlertCount = 0,
  expeditionRisk = 38,
  onNavigate,
}) => {
  const {
    expeditions,
    currentExpeditionId,
    currentExpedition,
    switchExpedition,
    dashboard,
    triggerRefresh,
  } = useExpedition();

  const { currentUser, currentRole, logout, canExecuteActions } = useAuth();

  const [isExpeditionDropdownOpen, setIsExpeditionDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [demoBannerMessage, setDemoBannerMessage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const loadUnread = async () => {
      if (!currentUser) return;
      const count = await fetchUnreadNotificationCount();
      if (isMounted) setUnreadCount(count);
    };
    loadUnread();
    const interval = setInterval(loadUnread, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser?.id, isNotificationDrawerOpen]);

  const displayRisk = dashboard?.kpi.overallRisk ?? expeditionRisk;
  const isRiskHigh = displayRisk > 60;
  const isRiskMedium = displayRisk > 40 && !isRiskHigh;

  const handleSimulateDelay = async () => {
    try {
      setIsProcessing(true);
      setDemoBannerMessage('Simulating +48h delay on high-priority cargo...');
      // Target MED-024 if present in expedition, else first cargo
      const targetId = 'MED-024';
      await simulateCargoDelay(targetId, 48);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      setDemoBannerMessage('CRITICAL: Shipment Delayed (+48h)! Stock dropped below safety threshold. Risk surged.');
      if (onNavigate) onNavigate('/cargo/MED-024');
    } catch (err: any) {
      alert(err.message || 'Error simulating delay');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteHeroAction = async () => {
    try {
      setIsProcessing(true);
      setDemoBannerMessage('Executing Emergency Stock Reallocation...');
      await executeHeroAction();
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      setDemoBannerMessage('SUCCESS: Stock reallocated. Station reserves replenished. Expedition risk stabilized.');
      if (onNavigate) onNavigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error executing action');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsProcessing(true);
      await resetDemoState();
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      setDemoBannerMessage('Telemetry reset to baseline normal readiness.');
      setTimeout(() => setDemoBannerMessage(null), 4000);
      if (onNavigate) onNavigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error resetting demo');
    } finally {
      setIsProcessing(false);
    }
  };

  const [offlineState, setOfflineState] = useState<OfflineCacheState>(OfflineSyncService.getState());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    return OfflineSyncService.subscribe((s) => setOfflineState(s));
  }, []);

  const handleToggleOffline = () => {
    OfflineSyncService.setSimulatedOffline(!offlineState.simulatedOffline);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await OfflineSyncService.drainQueue({
        updateTaskStatus: async (taskId, status, notes, fieldObservations) => {
          return updateTaskStatus(currentExpeditionId || '', taskId, status, { notes, fieldObservations });
        },
        recordCheckIn: async (expeditionId, personnelId, data) => {
          return recordCheckIn(expeditionId, personnelId, data);
        },
        createIncident: async (expeditionId, data) => {
          return createIncident(expeditionId, data);
        },
        triggerSos: async (expeditionId, data) => {
          return triggerEmergencySos(expeditionId, data);
        },
      });
      if (res.syncedCount > 0) {
        setDemoBannerMessage(`Synced ${res.syncedCount} queued operational field mutations to central server.`);
        triggerRefresh();
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const roleDisplayLabel =
    currentRole === 'ADMIN'
      ? 'Administrator'
      : currentRole === 'STATION_MANAGER'
      ? 'Station Manager'
      : currentRole === 'EXPEDITION_LEADER'
      ? 'Expedition Leader'
      : currentRole === 'LOGISTICS_COMMANDER'
      ? 'Logistics Coordinator'
      : 'Team Member';

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200">
        {/* Top Main Navigation Bar - Canonical Across ALL Roles (Section 20) */}
        <div className="h-16 px-6 flex items-center justify-between gap-4">
          {/* Left: Global Search Input */}
          <div className="flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full relative flex items-center text-left group cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 transition" />
              <div className="w-full pl-9 pr-14 py-2 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl text-xs text-slate-500 transition shadow-2xs font-normal">
                Search expeditions, stations, personnel, equipment, requirements...
              </div>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200/90 px-1.5 py-0.5 rounded-md bg-white shadow-2xs font-medium">
                Ctrl + K
              </span>
            </button>
          </div>

          {/* Right: Weather Context, Notifications & User Profile */}
          <div className="flex items-center space-x-3.5">
            {/* Current Station Weather Telemetry Context */}
            <div className="flex items-center space-x-2 text-xs text-slate-700 font-medium px-2.5 py-1.5 bg-slate-50/80 rounded-xl border border-slate-200/80 shadow-2xs">
              <CloudSnow className="w-4 h-4 text-sky-500" />
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-900">-15°C</span>
                <span className="text-slate-500 font-normal">Maitri Station</span>
              </div>
            </div>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition cursor-pointer"
              title="Operational Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : (dashboard?.kpi.activeAlerts ?? activeAlertCount) > 0 ? (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              ) : null}
            </button>

            {/* User Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 group text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#0284C7] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                  {currentUser?.name
                    ? currentUser.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'PC'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {currentUser?.name || 'Operations Officer'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal flex items-center space-x-1">
                    <span>{roleDisplayLabel}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                  </div>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isRoleDropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2.5 text-xs animate-fadeIn font-sans"
                  onMouseLeave={() => setIsRoleDropdownOpen(false)}
                >
                  <div className="px-3.5 pb-2.5 border-b border-slate-100">
                    <div className="font-semibold text-slate-900 text-sm">{currentUser?.name || 'Operator'}</div>
                    <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">{currentUser?.email || 'operator@polarcommand.org'}</div>
                    <div className="mt-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        {roleDisplayLabel}
                      </span>
                    </div>
                  </div>

                  <div className="px-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        logout();
                        if (onNavigate) onNavigate('/login');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center justify-between cursor-pointer"
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Status Notification Banner */}
        {demoBannerMessage && (
          <div className="bg-sky-50 border-b border-sky-200 px-6 py-1.5 text-xs text-sky-900 font-medium flex items-center justify-between animate-fadeIn">
            <span>{demoBannerMessage}</span>
            <button
              onClick={() => setDemoBannerMessage(null)}
              className="text-sky-700 hover:text-sky-900 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}
      </header>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(path) => {
          if (onNavigate) onNavigate(path);
        }}
      />

      {/* Notification Center Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        alerts={dashboard?.alerts || []}
        expeditionId={currentExpeditionId || ''}
        onNavigate={(path) => {
          if (onNavigate) onNavigate(path);
        }}
      />

      {/* Emergency SOS Countdown Modal (Section M) */}
      <SosEmergencyModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        onSuccess={() => {
          setIsSosModalOpen(false);
          triggerRefresh();
          if (onRefreshData) onRefreshData();
          if (onNavigate) onNavigate('/live-map');
        }}
      />
    </>
  );
};

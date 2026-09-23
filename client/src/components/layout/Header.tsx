import React, { useState } from 'react';
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
} from 'lucide-react';
import { simulateCargoDelay, executeHeroAction, resetDemoState } from '../../services/api';
import { useExpedition } from '../../context/ExpeditionContext';
import { useAuth } from '../../context/AuthContext';
import { CommandPalette } from '../common/CommandPalette';
import { NotificationDrawer } from '../common/NotificationDrawer';
import { UserRole } from '../../types';

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

  const { currentUser, currentRole, switchRole, canExecuteActions } = useAuth();

  const [isExpeditionDropdownOpen, setIsExpeditionDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [demoBannerMessage, setDemoBannerMessage] = useState<string | null>(null);

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

  const roles: UserRole[] = ['COMMANDER', 'ADMIN', 'LOGISTICS_OFFICER', 'STATION_MANAGER', 'VIEWER'];

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200">
        {/* Top Main Navigation Bar */}
        <div className="h-16 px-6 flex items-center justify-between gap-4">
          {/* Left: Expedition Selector */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setIsExpeditionDropdownOpen(!isExpeditionDropdownOpen)}
                className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition group text-left"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    Active Expedition
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                    <span>{currentExpedition?.code || 'Select Expedition'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                  </div>
                </div>
              </button>

              {/* Expedition Switcher Dropdown */}
              {isExpeditionDropdownOpen && (
                <div
                  className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-fadeIn"
                  onMouseLeave={() => setIsExpeditionDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100">
                    Available Expeditions
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {expeditions.map((exp) => (
                      <button
                        key={exp.id}
                        onClick={() => {
                          switchExpedition(exp.id);
                          setIsExpeditionDropdownOpen(false);
                          if (onRefreshData) onRefreshData();
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                          exp.id === currentExpeditionId ? 'bg-sky-50 text-sky-800 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{exp.code}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">{exp.name}</div>
                        </div>
                        {exp.id === currentExpeditionId && (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1 px-1">
                    <button
                      onClick={() => {
                        setIsExpeditionDropdownOpen(false);
                        if (onNavigate) onNavigate('/expeditions/new');
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-sky-700 hover:bg-sky-50 rounded-lg flex items-center space-x-1.5 font-semibold text-[11px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Expedition</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsExpeditionDropdownOpen(false);
                        if (onNavigate) onNavigate('/expeditions');
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center space-x-1.5 font-medium text-[11px]"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Expeditions Hub</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Risk Indicator Pill */}
            <div
              className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                isRiskHigh
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isRiskMedium
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Risk Index: {displayRisk}/100</span>
            </div>
          </div>

          {/* Center: Global Search (Triggers Command Palette) */}
          <div className="flex-1 max-w-md hidden lg:block">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full relative flex items-center text-left"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <div className="w-full pl-9 pr-12 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs text-slate-500 transition">
                Search cargo ID, asset code, station...
              </div>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 px-1 rounded bg-white shadow-2xs">
                Ctrl+K
              </span>
            </button>
          </div>

          {/* Right: Weather, Hero Controls & Profile */}
          <div className="flex items-center space-x-3">
            {/* Real Antarctic Station Weather Telemetry */}
            {dashboard?.stationsSummary && dashboard.stationsSummary.length > 0 && (
              <div className="hidden xl:flex items-center space-x-3 text-xs border-r border-slate-200 pr-3">
                {dashboard.stationsSummary.slice(0, 2).map((st) => (
                  <div key={st.id} className="flex items-center space-x-1.5 text-slate-600">
                    <CloudSnow className="w-3.5 h-3.5 text-sky-500" />
                    <span className="font-semibold text-slate-800">{st.name.split(' ')[0]}:</span>
                    <span className="font-mono text-sky-700">
                      {st.weather ? `${st.weather.tempCelsius}°C` : '-15°C'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Notifications Bell */}
            <button
              onClick={() => setIsNotificationDrawerOpen(true)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Operational Alerts Center"
            >
              <Bell className="w-4 h-4" />
              {(dashboard?.kpi.activeAlerts ?? activeAlertCount) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              )}
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center space-x-2 pl-2 border-l border-slate-200 group text-left"
              >
                <div className="w-8 h-8 rounded-full bg-sky-700 text-white font-bold text-xs flex items-center justify-center ring-2 ring-sky-100">
                  {currentUser?.name
                    ? currentUser.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'CD'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser?.name || 'Commander'}
                  </div>
                  <div className="text-[10px] text-sky-700 font-semibold flex items-center space-x-1">
                    <span>{currentRole}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                  </div>
                </div>
              </button>

              {/* RBAC Role Switcher Dropdown */}
              {isRoleDropdownOpen && (
                <div
                  className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-fadeIn"
                  onMouseLeave={() => setIsRoleDropdownOpen(false)}
                >
                  <div className="px-3 py-1 font-bold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100">
                    Switch Active RBAC Role
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRole(r);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition ${
                        currentRole === r ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <span>{r.replace('_', ' ')}</span>
                      {currentRole === r && <UserCheck className="w-3.5 h-3.5 text-sky-600" />}
                    </button>
                  ))}
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 mt-1">
                    Controls mutation & action permissions
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Demo Quick Control Ribbon */}
        <div className="bg-slate-900 text-white px-6 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 bg-sky-500 text-white text-[10px] font-extrabold uppercase rounded tracking-wider">
              Decision Support
            </span>
            <span className="text-slate-300 font-medium text-[11px] hidden sm:inline">
              Expedition Operations:
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSimulateDelay}
              disabled={isProcessing}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded font-semibold text-[11px] transition shadow-xs disabled:opacity-50"
              title="Simulate delay to trigger automated risk cascade and alert generation"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate Delay</span>
            </button>

            <button
              onClick={handleExecuteHeroAction}
              disabled={isProcessing || !canExecuteActions}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded font-semibold text-[11px] transition shadow-xs disabled:opacity-50"
              title={
                canExecuteActions
                  ? 'Execute AI recommended reallocation to mitigate risk'
                  : 'Commander or Admin role required to execute action'
              }
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Reallocate Stock (Mitigate Risk)</span>
            </button>

            <button
              onClick={handleReset}
              disabled={isProcessing}
              className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] transition"
              title="Reset state to baseline"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Dynamic Status Notification Banner */}
        {demoBannerMessage && (
          <div className="bg-sky-50 border-b border-sky-200 px-6 py-1.5 text-xs text-sky-900 font-medium flex items-center justify-between animate-fadeIn">
            <span>{demoBannerMessage}</span>
            <button
              onClick={() => setDemoBannerMessage(null)}
              className="text-sky-700 hover:text-sky-900 text-xs font-bold"
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
    </>
  );
};

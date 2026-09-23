import React from 'react';
import {
  Users,
  Package,
  Truck,
  Boxes,
  Bell,
  ShieldAlert,
  ArrowUpRight,
  ChevronRight,
  Layers,
  Activity,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { DashboardSummary } from '../types';
import { PolarMap } from '../components/map/PolarMap';

interface CommandCenterProps {
  summary: DashboardSummary | null;
  onNavigate: (path: string) => void;
  onSelectStation?: (stationId: string) => void;
  onSelectCargo?: (cargoId: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  summary,
  onNavigate,
  onSelectStation,
  onSelectCargo,
}) => {
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs font-semibold">Synchronizing with Antarctic Station Telemetry...</div>
        </div>
      </div>
    );
  }

  const { kpi, alerts, stations, expedition, recentActivity, stationsSummary } = summary;
  const isHighRisk = kpi.overallRisk > 60;
  const isWarningRisk = kpi.overallRisk > 40 && !isHighRisk;

  const criticalAlertsCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highAlertsCount = alerts.filter((a) => a.severity === 'HIGH').length;

  return (
    <div className="space-y-6">
      {/* Top Header Strip with Title & Code */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Command Center (Dashboard)
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-mono font-bold border border-sky-200">
              {expedition?.code || 'ACTIVE'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {expedition?.name || 'Antarctic Expedition Operations'} • Real-Time Integrated Monitoring
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('/simulations')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition flex items-center space-x-1.5"
          >
            <span>What-If Simulator</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={() => onNavigate('/emergency')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs transition flex items-center space-x-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Protocol</span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Personnel */}
        <div
          onClick={() => onNavigate('/personnel')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Personnel</span>
            <Users className="w-4 h-4 text-sky-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpi.personnel}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1 mt-0.5">
            <span>{(kpi.personnelInTransit ?? 0) > 0 ? `${kpi.personnelInTransit} In Transit` : 'All On-Ice'}</span>
          </div>
        </div>

        {/* KPI 2: Cargo Shipments */}
        <div
          onClick={() => onNavigate('/cargo')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cargo Shipments</span>
            <Package className="w-4 h-4 text-sky-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpi.cargoShipments}</div>
          <div className="text-[11px] font-medium flex items-center space-x-1 mt-0.5">
            <span className={(kpi.delayedCargoCount ?? 0) > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
              {(kpi.delayedCargoCount ?? 0) > 0 ? `${kpi.delayedCargoCount} Delayed` : `${kpi.inTransitCargoCount ?? 0} In Transit`}
            </span>
          </div>
        </div>

        {/* KPI 3: Assets */}
        <div
          onClick={() => onNavigate('/assets')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Assets</span>
            <Truck className="w-4 h-4 text-slate-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpi.assets}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center space-x-1 mt-0.5">
            <span>{kpi.operationalAssetsCount}/{kpi.assets} Operational</span>
          </div>
        </div>

        {/* KPI 4: Inventory Readiness */}
        <div
          onClick={() => onNavigate('/inventory')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Inventory Readiness</span>
            <Boxes className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              kpi.inventoryReadiness < 80 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {kpi.inventoryReadiness}%
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1 mt-0.5">
            <span>
              {(kpi.inventoryItemsAtRisk ?? 0) > 0 ? `${kpi.inventoryItemsAtRisk} At Risk` : 'Reserves Normal'}
            </span>
          </div>
        </div>

        {/* KPI 5: Active Alerts */}
        <div
          onClick={() => onNavigate('/alerts')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Alerts</span>
            <Bell className="w-4 h-4 text-rose-600 group-hover:scale-110 transition" />
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              kpi.activeAlerts > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {kpi.activeAlerts}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold flex items-center space-x-1 mt-0.5">
            <span>
              {criticalAlertsCount > 0
                ? `${criticalAlertsCount} Critical`
                : highAlertsCount > 0
                ? `${highAlertsCount} High`
                : 'All Cleared'}
            </span>
          </div>
        </div>

        {/* KPI 6: Overall Expedition Risk */}
        <div
          onClick={() => onNavigate('/simulations')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Expedition Risk</span>
            <ShieldAlert
              className={`w-4 h-4 ${
                isHighRisk ? 'text-rose-600' : isWarningRisk ? 'text-amber-500' : 'text-emerald-600'
              }`}
            />
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              isHighRisk ? 'text-rose-600' : isWarningRisk ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {kpi.overallRisk}
            <span className="text-xs font-bold text-slate-400">/100</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {kpi.riskLevel || (isHighRisk ? 'SURGE STATE' : 'Normal Operating')}
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left/Center) + Operational Alerts & Risk (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Map Center Panel (8 cols) */}
        <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                <span>Polar Logistics Maritime & Air Corridors</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono font-medium">
                  India ➔ Southern Ocean ➔ Antarctica
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Interactive real-time transit telemetry between Indian supply ports and polar research bases
              </div>
            </div>

            <button
              onClick={() => onNavigate('/cargo')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
            >
              <span>View Manifest</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Polar Logistics Map */}
          <div className="flex-1 min-h-[380px] w-full">
            <PolarMap
              stations={stations || []}
              cargo={[]}
              onSelectStation={onSelectStation}
              onSelectCargo={onSelectCargo}
            />
          </div>
        </div>

        {/* Operational Alerts Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-slate-900">Operational Alerts</span>
                {kpi.activeAlerts > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </div>
              <button
                onClick={() => onNavigate('/alerts')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700"
              >
                View All ({alerts.length})
              </button>
            </div>

            {/* Alert List */}
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                No active operational alerts. Station systems nominal.
              </div>
            ) : (
              <div className="space-y-2.5">
                {alerts.slice(0, 4).map((alert) => {
                  const isCritical = alert.severity === 'CRITICAL';
                  const isHigh = alert.severity === 'HIGH';
                  const isMed = alert.severity === 'MEDIUM';

                  return (
                    <div
                      key={alert.id}
                      onClick={() => onNavigate('/alerts')}
                      className={`p-3 rounded-lg border text-xs transition cursor-pointer hover:shadow-xs ${
                        isCritical
                          ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                          : isHigh
                          ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                          : isMed
                          ? 'bg-sky-50/60 border-sky-200 hover:border-sky-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                            isCritical
                              ? 'bg-rose-600 text-white'
                              : isHigh
                              ? 'bg-amber-600 text-white'
                              : 'bg-sky-600 text-white'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {alert.timestamp || 'Live'}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 text-xs mb-0.5">{alert.title}</div>
                      <div className="text-slate-600 text-[11px] line-clamp-1">{alert.impact}</div>

                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">{alert.affectedEntity}</span>
                        <span className="font-bold text-sky-700 hover:underline">Take Action ➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Risk Breakdown Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-2.5 rounded-lg text-xs">
            <div className="flex justify-between items-center mb-1 text-[11px]">
              <span className="font-bold text-slate-700">Risk Factor Distribution:</span>
              <span className="font-mono text-slate-500">Normalized 0-100</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
              <div className="bg-white p-1 rounded border border-slate-200">
                <div className="text-slate-400">Cargo</div>
                <div className="font-bold text-sky-700">{kpi.riskBreakdown?.cargo ?? 0}</div>
              </div>
              <div className="bg-white p-1 rounded border border-slate-200">
                <div className="text-slate-400">Inv</div>
                <div className="font-bold text-amber-700">{kpi.riskBreakdown?.inventory ?? 0}</div>
              </div>
              <div className="bg-white p-1 rounded border border-slate-200">
                <div className="text-slate-400">Asset</div>
                <div className="font-bold text-slate-700">{kpi.riskBreakdown?.assets ?? 0}</div>
              </div>
              <div className="bg-white p-1 rounded border border-slate-200">
                <div className="text-slate-400">Team</div>
                <div className="font-bold text-slate-700">{kpi.riskBreakdown?.personnel ?? 0}</div>
              </div>
              <div className="bg-white p-1 rounded border border-slate-200">
                <div className="text-slate-400">Weath</div>
                <div className="font-bold text-slate-700">{kpi.riskBreakdown?.weather ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Audit Activity Trail & Stations Strip */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <span className="font-extrabold text-sm text-slate-900">Live Decision & Audit Log Trail</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Immutable Log Stream</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {recentActivity.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-[11px] truncate">{log.action}</span>
                    <span className="text-[9px] font-mono text-slate-400">{log.entityType || log.entity}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-2">{log.details || log.reason || log.newStateJson || ''}</div>
                </div>
                <div className="text-[9px] font-mono text-slate-400 mt-2 pt-1 border-t border-slate-200/40 flex items-center justify-between">
                  <span>{log.actorName || log.userName || 'Commander'}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Operational Intelligence Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Inventory Forecast */}
        <div
          onClick={() => onNavigate('/inventory')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Boxes className="w-4 h-4 text-sky-600" />
            <span>Inventory Readiness</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1">
            {kpi.inventoryReadiness}% Operational
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
            {(kpi.inventoryItemsAtRisk ?? 0) > 0 ? `${kpi.inventoryItemsAtRisk} items near safety limit` : 'Healthy reserves'}
          </div>
        </div>

        {/* 2. Cargo Status */}
        <div
          onClick={() => onNavigate('/cargo')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Package className="w-4 h-4 text-sky-600" />
            <span>Cargo Shipments</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1">{kpi.cargoShipments} Tracked</div>
          <div
            className={`text-[11px] font-semibold mt-0.5 ${
              (kpi.delayedCargoCount ?? 0) > 0 ? 'text-rose-600' : 'text-slate-500'
            }`}
          >
            {(kpi.delayedCargoCount ?? 0) > 0 ? `${kpi.delayedCargoCount} Delayed en route` : 'All corridors on schedule'}
          </div>
        </div>

        {/* 3. Asset Readiness */}
        <div
          onClick={() => onNavigate('/assets')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Truck className="w-4 h-4 text-sky-600" />
            <span>Asset Readiness</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1">
            {kpi.operationalAssetsCount}/{kpi.assets} Operational
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
            {(kpi.maintenanceDueAssetsCount ?? 0) > 0
              ? `${kpi.maintenanceDueAssetsCount} maintenance intervals due`
              : 'Fleet nominal'}
          </div>
        </div>

        {/* 4. Personnel Status */}
        <div
          onClick={() => onNavigate('/personnel')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Personnel Status</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1">{kpi.personnel} On-Ice Members</div>
          <div className="text-[11px] text-sky-600 font-semibold mt-0.5">
            {(kpi.personnelInTransit ?? 0) > 0 ? `${kpi.personnelInTransit} In Transit / Traverses` : 'Station positioned'}
          </div>
        </div>

        {/* 5. Station Health */}
        <div
          onClick={() => onNavigate('/stations')}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 transition cursor-pointer"
        >
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>Station Health</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-1">
            {stationsSummary && stationsSummary.length > 0
              ? `${stationsSummary[0]?.name.split(' ')[0]}: Risk ${stationsSummary[0]?.currentRisk ?? 20}`
              : 'Stations Online'}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {stationsSummary && stationsSummary.length > 1
              ? `${stationsSummary[1]?.name.split(' ')[0]}: Risk ${stationsSummary[1]?.currentRisk ?? 25}`
              : 'Telemetry Active'}
          </div>
        </div>
      </div>
    </div>
  );
};

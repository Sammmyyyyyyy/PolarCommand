import React, { useState } from 'react';
import {
  BellRing,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  CheckSquare,
  Zap,
  Play,
} from 'lucide-react';
import { Alert, ActionItem } from '../types';
import { acknowledgeAlert, resolveAlert, dismissAlert, executeAction, executeHeroAction } from '../services/api';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { getUserScope } from '../utils/userScope';

interface AlertsActionCenterProps {
  alertsList: Alert[];
  actionsList: ActionItem[];
  onRefreshData?: () => void;
  onNavigate?: (path: string) => void;
}

export const AlertsActionCenter: React.FC<AlertsActionCenterProps> = ({
  alertsList,
  actionsList,
  onRefreshData,
  onNavigate,
}) => {
  const { currentExpeditionId, currentExpedition, triggerRefresh } = useExpedition();
  const { currentUser, canExecuteActions, canEditOperationalData } = useAuth();
  const scope = getUserScope(currentUser);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const getAlertCategory = (a: Alert): string => {
    const src = (a.source || '').toUpperCase();
    const title = (a.title || '').toUpperCase();
    if (src.includes('EMERGENCY') || src.includes('SOS') || title.includes('SOS') || title.includes('EMERGENCY')) return 'Emergency';
    if (src.includes('INVENTORY') || title.includes('INVENTORY') || title.includes('STOCK')) return 'Inventory';
    if (src.includes('CARGO') || src.includes('SHIPMENT') || title.includes('CARGO') || title.includes('SHIPMENT')) return 'Shipment';
    if (src.includes('EQUIPMENT') || title.includes('EQUIPMENT') || title.includes('ASSET')) return 'Equipment';
    if (src.includes('STATION') || title.includes('STATION')) return 'Station';
    if (src.includes('EXPEDITION') || title.includes('EXPEDITION') || title.includes('TRAVERSE')) return 'Expedition';
    return 'System';
  };

  const scopedAlerts = scope.filterAlerts(alertsList);

  const filteredAlerts = scopedAlerts.filter((a) => {
    const cat = getAlertCategory(a);
    const matchesCategory =
      selectedCategory === 'All' || cat.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSeverity =
      selectedSeverity === 'All' || a.severity.toLowerCase() === selectedSeverity.toLowerCase();
    const matchesStatus =
      selectedStatus === 'All' || a.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesCategory && matchesSeverity && matchesStatus;
  });

  const handleAcknowledge = async (id: string) => {
    if (!currentExpeditionId) return;
    try {
      await acknowledgeAlert(currentExpeditionId, id);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error acknowledging alert');
    }
  };

  const handleResolve = async (id: string) => {
    if (!currentExpeditionId) return;
    try {
      await resolveAlert(currentExpeditionId, id);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error resolving alert');
    }
  };

  const handleExecuteSingleAction = async (actionId: string) => {
    if (!currentExpeditionId) return;
    try {
      setExecutingActionId(actionId);
      await executeAction(currentExpeditionId, actionId);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      alert('Action executed successfully! Risk recalculation completed.');
    } catch (err: any) {
      alert(err.message || 'Error executing action');
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleExecuteHeroMitigation = async () => {
    try {
      await executeHeroAction();
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      alert('Emergency response action dispatched! Stock reallocated and alerts resolved.');
    } catch (err: any) {
      alert(err.message || 'Error executing action');
    }
  };

  const activeCount = alertsList.filter((a) => a.status !== 'RESOLVED' && a.status !== 'Resolved').length;
  const criticalCount = alertsList.filter((a) => a.severity.toUpperCase() === 'CRITICAL').length;
  const resolvedCount = alertsList.filter((a) => a.status.toUpperCase() === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BellRing className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Alerts & Action Center
            </h1>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 font-mono">
              {activeCount} Active Issues
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time polar mission alerts, automated lifecycle triage (Active ➔ Acknowledged ➔ Resolved), and mitigation dispatch for{' '}
            <strong className="text-slate-800 font-medium">{currentExpedition?.title || currentExpedition?.name || 'Active Mission'}</strong>
          </p>
        </div>

        {/* Global Mitigation Trigger */}
        {canExecuteActions && (
          <button
            onClick={handleExecuteHeroMitigation}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Execute Recommended Mitigation</span>
          </button>
        )}
      </div>

      {/* Operational Metric Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Total Alerts</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{alertsList.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Recorded events</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Critical Severity</div>
          <div className={`text-xl font-bold mt-0.5 ${criticalCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {criticalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Immediate intervention</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Active / Pending</div>
          <div className={`text-xl font-bold mt-0.5 ${activeCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {activeCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting resolution</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Resolved Nominal</div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{resolvedCount}</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Mitigated successfully</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs text-xs">
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
          <span className="text-slate-500 font-medium mr-1">Category:</span>
          {['All', 'Emergency', 'Inventory', 'Shipment', 'Equipment', 'Station', 'Expedition', 'System'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs transition cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 font-medium'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Severity:</span>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1 rounded-md text-xs transition cursor-pointer ${
                  selectedSeverity.toLowerCase() === sev.toLowerCase()
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 font-medium'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            {['All', 'Active', 'Acknowledged', 'Resolved'].map((stat) => (
              <button
                key={stat}
                onClick={() => setSelectedStatus(stat)}
                className={`px-3 py-1 rounded-md text-xs transition cursor-pointer ${
                  selectedStatus.toLowerCase() === stat.toLowerCase()
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 font-medium'
                }`}
              >
                {stat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Alert Event</th>
                <th className="py-3 px-4">Affected Entity / Station</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Operational Impact</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    No alerts found matching this filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isCritical = alert.severity.toUpperCase() === 'CRITICAL';
                  const isHigh = alert.severity.toUpperCase() === 'HIGH';
                  const isResolved = alert.status.toUpperCase() === 'RESOLVED';
                  const isAck = alert.status.toUpperCase() === 'ACKNOWLEDGED';
                  const alertCategory = getAlertCategory(alert);
                  const formattedTime = alert.createdAt || alert.timestamp
                    ? new Date(alert.createdAt || alert.timestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '10m ago';

                  return (
                    <tr key={alert.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isHigh
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{alert.title}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{alert.affectedEntity}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formattedTime}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">{alert.impact}</td>
                      <td className="py-3.5 px-4 text-sky-900 font-medium max-w-xs">
                        {alert.recommendedAction || 'Monitor station parameters'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            isResolved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isAck
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Contextual Action Button based on category */}
                        {onNavigate && (
                          <>
                            {alertCategory === 'Emergency' && (
                              <button
                                type="button"
                                onClick={() => onNavigate(`/live-map?expedition=${alert.expeditionId || ''}${alert.personnelId ? `&personnel=${alert.personnelId}` : ''}`)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium text-[11px] transition shadow-2xs cursor-pointer"
                              >
                                Focus on Map
                              </button>
                            )}
                            {alertCategory === 'Inventory' && (
                              <button
                                type="button"
                                onClick={() => onNavigate(alert.stationId ? `/inventory?station=${alert.stationId}` : '/inventory')}
                                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded font-medium text-[11px] transition shadow-2xs cursor-pointer"
                              >
                                View Inventory
                              </button>
                            )}
                            {alertCategory === 'Shipment' && (
                              <button
                                type="button"
                                onClick={() => onNavigate('/logistics?tab=tracking')}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-[11px] transition shadow-2xs cursor-pointer"
                              >
                                Track Shipment
                              </button>
                            )}
                            {alertCategory === 'Expedition' && (
                              <button
                                type="button"
                                onClick={() => onNavigate(`/expeditions/${alert.expeditionId || ''}`)}
                                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded font-medium text-[11px] transition shadow-2xs cursor-pointer"
                              >
                                View Expedition
                              </button>
                            )}
                          </>
                        )}
                        {!isResolved ? (
                          <>
                            {canEditOperationalData && !isAck && (
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] transition cursor-pointer"
                              >
                                Acknowledge
                              </button>
                            )}
                            {canExecuteActions && (
                              <button
                                onClick={() => handleResolve(alert.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] transition cursor-pointer"
                              >
                                Resolve
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center justify-end space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolved</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatched Actions Manifest */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="font-semibold text-sm text-slate-900">
            Dispatched Response Actions & Mitigation Tasks
          </div>
          <span className="text-xs text-slate-400 font-mono">{actionsList.length} Active Records</span>
        </div>

        <div className="space-y-3">
          {actionsList.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No pending mitigation action items.
            </div>
          ) : (
            actionsList.map((action) => {
              const isCompleted = action.status.toUpperCase() === 'COMPLETED';

              return (
                <div
                  key={action.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 text-sm flex items-center space-x-2">
                      <span>{action.title}</span>
                      <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded text-[10px] font-mono font-normal">
                        {action.id}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1">{action.description}</div>
                    {action.impactDescription && (
                      <div className="text-emerald-700 font-medium mt-1">
                        Expected Impact: {action.impactDescription}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-end justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase ${
                        isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {action.status}
                    </span>

                    {!isCompleted && canExecuteActions && (
                      <button
                        onClick={() => handleExecuteSingleAction(action.id)}
                        disabled={executingActionId === action.id}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] transition flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>{executingActionId === action.id ? 'Executing...' : 'Execute'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

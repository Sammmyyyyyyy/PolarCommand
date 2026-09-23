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
  const { canExecuteActions, canEditOperationalData } = useAuth();

  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const filteredAlerts = alertsList.filter((a) => {
    const matchesSeverity =
      selectedSeverity === 'All' || a.severity.toLowerCase() === selectedSeverity.toLowerCase();
    const matchesStatus =
      selectedStatus === 'All' || a.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSeverity && matchesStatus;
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

  return (
    <div className="space-y-6">
      {/* Top Header matching Screen 11 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BellRing className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Alerts & Action Center
            </h1>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 font-mono">
              {activeCount} Active Issues
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational triage, lifecycle tracking (Active ➔ Acknowledged ➔ Resolved), and mitigations for{' '}
            <strong className="text-slate-800">{currentExpedition?.code || 'Active Expedition'}</strong>
          </p>
        </div>

        {/* Global Mitigation Trigger */}
        {canExecuteActions && (
          <button
            onClick={handleExecuteHeroMitigation}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Execute Recommended Mitigation</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Severity:</span>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                selectedSeverity.toLowerCase() === sev.toLowerCase()
                  ? 'bg-sky-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Status:</span>
          {['All', 'Active', 'Acknowledged', 'Resolved'].map((stat) => (
            <button
              key={stat}
              onClick={() => setSelectedStatus(stat)}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                selectedStatus.toLowerCase() === stat.toLowerCase()
                  ? 'bg-sky-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {stat}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Alert Title</th>
                <th className="py-3 px-4">Affected Entity</th>
                <th className="py-3 px-4">Operational Impact</th>
                <th className="py-3 px-4">Decision Support Recommendation</th>
                <th className="py-3 px-4">Lifecycle</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
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

                  return (
                    <tr key={alert.id} className="hover:bg-sky-50/30 transition">
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
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
                      <td className="py-3.5 px-4 font-bold text-slate-900">{alert.title}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{alert.affectedEntity}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">{alert.impact}</td>
                      <td className="py-3.5 px-4 text-sky-900 font-medium max-w-xs">
                        {alert.recommendedAction || 'Monitor station parameters'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
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
                        {!isResolved ? (
                          <>
                            {canEditOperationalData && !isAck && (
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] transition"
                              >
                                Acknowledge
                              </button>
                            )}
                            {canExecuteActions && (
                              <button
                                onClick={() => handleResolve(alert.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] transition"
                              >
                                Resolve
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end space-x-1">
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
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="font-extrabold text-sm text-slate-900">
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
                    <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                      <span>{action.title}</span>
                      <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded text-[10px] font-mono">
                        {action.id}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1">{action.description}</div>
                    {action.impactDescription && (
                      <div className="text-emerald-700 font-semibold mt-1">
                        Expected Impact: {action.impactDescription}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col items-end justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                        isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {action.status}
                    </span>

                    {!isCompleted && canExecuteActions && (
                      <button
                        onClick={() => handleExecuteSingleAction(action.id)}
                        disabled={executingActionId === action.id}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] transition flex items-center space-x-1"
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

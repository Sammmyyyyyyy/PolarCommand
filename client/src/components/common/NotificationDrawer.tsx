import React from 'react';
import { Bell, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Alert } from '../../types';
import { updateAlertStatus } from '../../services/api';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts?: Alert[];
  expeditionId?: string;
  onRefreshData?: () => void;
  onNavigate: (path: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  alerts = [],
  expeditionId = '',
  onRefreshData,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const activeAlerts = (alerts || []).filter((a) => a.status !== 'RESOLVED' && a.status !== 'Resolved');

  const handleAcknowledge = async (alertId: string) => {
    try {
      await updateAlertStatus(expeditionId, alertId, 'ACKNOWLEDGED');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">Mission Notification Center</h2>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200">
              {activeAlerts.length} Active
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500/80" />
              <div className="text-xs font-bold text-slate-700">All Systems Nominal</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                No active critical alerts or supply bottlenecks detected for this expedition.
              </p>
            </div>
          ) : (
            activeAlerts.map((alt) => {
              const isCrit = alt.severity === 'CRITICAL' || alt.severity === 'Critical';
              return (
                <div
                  key={alt.id}
                  className={`p-3.5 rounded-xl border text-left space-y-2 transition ${
                    isCrit ? 'bg-rose-50/40 border-rose-200/90' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCrit ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
                        }`}
                      ></span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {alt.source}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                        isCrit ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {alt.severity}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 leading-snug">{alt.title}</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">{alt.reason}</div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Target: {alt.affectedEntity}
                    </span>
                    <button
                      onClick={() => handleAcknowledge(alt.id)}
                      className="text-[10px] font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Link */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => {
              onNavigate('/alerts');
              onClose();
            }}
            className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5"
          >
            <span>Open Decision Actions & Alerts Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

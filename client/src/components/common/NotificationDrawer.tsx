import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight, X, CheckCheck } from 'lucide-react';
import { Alert, Notification } from '../../types';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, updateAlertStatus } from '../../services/api';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchNotifications();
      setNotifications(list);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  if (!isOpen) return null;

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const activeAlerts = (alerts || []).filter((a) => a.status !== 'RESOLVED' && a.status !== 'Resolved');

  const handleMarkRead = async (notifId: string, link?: string | null) => {
    try {
      await markNotificationAsRead(notifId);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
      if (onRefreshData) onRefreshData();
      if (link) {
        onNavigate(link);
        onClose();
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
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
            <h2 className="text-sm font-semibold text-slate-900">Notifications & Alerts</h2>
            {unreadNotifications.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-200">
                {unreadNotifications.length} New
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {unreadNotifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 px-2 py-1 rounded hover:bg-sky-50 transition flex items-center space-x-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications & Alerts List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {notifications.length > 0 ? (
            notifications.map((notif) => {
              const isCrit = notif.severity === 'CRITICAL';
              const isHigh = notif.severity === 'HIGH';
              return (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id, notif.link)}
                  className={`p-3.5 rounded-xl border text-left space-y-1.5 transition cursor-pointer ${
                    !notif.isRead
                      ? isCrit
                        ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                        : isHigh
                        ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                        : 'bg-sky-50/50 border-sky-200 shadow-2xs'
                      : 'bg-white border-slate-100 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      {!notif.isRead && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isCrit ? 'bg-rose-600 animate-pulse' : 'bg-sky-500'
                          }`}
                        />
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {notif.type}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                        isCrit
                          ? 'bg-rose-100 text-rose-700'
                          : isHigh
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {notif.severity}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-900 leading-snug">{notif.title}</div>
                  <div className="text-[11px] text-slate-600 leading-relaxed font-normal">{notif.message}</div>

                  <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {!notif.isRead && (
                      <span className="text-sky-600 font-medium">Click to open & mark read →</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : activeAlerts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500/80" />
              <div className="text-xs font-semibold text-slate-700">All Operations Nominal</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                No active notifications or critical alerts currently require your attention.
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
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {alt.source}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                        isCrit ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {alt.severity}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-900 leading-snug">{alt.title}</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed font-normal">{alt.reason}</div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Target: {alt.affectedEntity}
                    </span>
                    <button
                      onClick={() => handleAcknowledgeAlert(alt.id)}
                      className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 flex items-center space-x-1 cursor-pointer"
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
            className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>View Full Alerts Action Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

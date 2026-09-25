import React, { useState, useEffect } from 'react';
import {
  Compass,
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Wifi,
  WifiOff,
  RefreshCw,
  MapPin,
  Truck,
  Users,
  Calendar,
  CloudSnow,
  ShieldAlert,
  FileText,
  AlertOctagon,
  ChevronRight,
  Flame,
  Battery,
  Layers,
  Binoculars,
  Navigation,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpedition } from '../context/ExpeditionContext';
import {
  Task,
  Personnel,
  Alert,
  Incident,
  CheckInStatus,
  WeatherConditionReport,
  FieldObservation,
  ObservationCategory,
  ObservationSeverity,
  Movement,
} from '../types';
import {
  fetchTasks,
  updateTaskStatus,
  recordCheckIn,
  triggerEmergencySos,
  fetchPersonnelAccountability,
  fetchStationWeather,
  fetchFieldObservations,
  createFieldObservation,
  fetchMovements,
} from '../services/api';
import { OfflineSyncService, OfflineCacheState } from '../services/offlineSync';
import { WeatherTelemetryWidget } from '../components/weather/WeatherTelemetryWidget';

interface FieldMemberWorkspaceProps {
  onNavigate?: (path: string) => void;
  onRefreshData?: () => void;
}

export const FieldMemberWorkspace: React.FC<FieldMemberWorkspaceProps> = ({ onNavigate, onRefreshData }) => {
  const { currentUser } = useAuth();
  const { currentExpeditionId, currentExpedition, dashboard } = useExpedition();

  const [offlineState, setOfflineState] = useState<OfflineCacheState>(OfflineSyncService.getState());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [observations, setObservations] = useState<FieldObservation[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [activeTaskFilter, setActiveTaskFilter] = useState<'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskObservation, setTaskObservation] = useState('');

  // Check-In Form
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>('ACTIVE');
  const [checkInLocation, setCheckInLocation] = useState('');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckInTime, setLastCheckInTime] = useState<string | null>(null);

  // Weather & Telemetry
  const [weatherReport, setWeatherReport] = useState<WeatherConditionReport | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Field Observation Modal
  const [showObsModal, setShowObsModal] = useState(false);
  const [obsCategory, setObsCategory] = useState<ObservationCategory>('ENVIRONMENT');
  const [obsSeverity, setObsSeverity] = useState<ObservationSeverity>('LOW');
  const [obsDescription, setObsDescription] = useState('');
  const [obsLocation, setObsLocation] = useState('');
  const [obsRelatedTaskId, setObsRelatedTaskId] = useState('');
  const [isSubmittingObs, setIsSubmittingObs] = useState(false);

  // Emergency SOS Modal / Action
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosMessage, setSosMessage] = useState('');
  const [isTransmittingSos, setIsTransmittingSos] = useState(false);
  const [sosSuccessMessage, setSosSuccessMessage] = useState<string | null>(null);

  // Field Incident Report Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentType, setIncidentType] = useState('Equipment / Mechanical Stoppage');
  const [incidentSeverity, setIncidentSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSupport, setIncidentSupport] = useState('Mechanical support vehicle dispatch');

  useEffect(() => {
    const unsub = OfflineSyncService.subscribe((state) => {
      setOfflineState(state);
      if (state.tasks.length > 0) {
        setTasks(state.tasks);
      }
    });
    return unsub;
  }, []);

  const loadFieldData = async () => {
    if (!currentExpeditionId) return;
    try {
      if (offlineState.connectivityStatus !== 'OFFLINE') {
        const [fetchedTasks, fetchedObs, fetchedMovs] = await Promise.all([
          fetchTasks(currentExpeditionId),
          fetchFieldObservations(currentExpeditionId).catch(() => []),
          fetchMovements(currentExpeditionId).catch(() => []),
        ]);
        setTasks(fetchedTasks);
        setObservations(fetchedObs);
        setMovements(fetchedMovs);
        OfflineSyncService.cacheExpeditionData(currentExpeditionId, fetchedTasks);

        // Fetch station weather
        const defaultStation = dashboard?.stationsSummary[0];
        if (defaultStation) {
          const w = await fetchStationWeather(currentExpeditionId, defaultStation.id);
          setWeatherReport(w);
        }
      }
    } catch (e) {
      console.warn('Network unavailable, falling back to cached offline state', e);
    }
  };

  const handleRefreshWeather = async () => {
    if (!currentExpeditionId || !dashboard?.stationsSummary[0]) return;
    setWeatherLoading(true);
    try {
      const w = await fetchStationWeather(currentExpeditionId, dashboard.stationsSummary[0].id, true);
      setWeatherReport(w);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    loadFieldData();
  }, [currentExpeditionId, offlineState.connectivityStatus]);

  // Handle Sync Now
  const handleManualSync = async () => {
    if (offlineState.simulatedOffline) {
      alert('Cannot sync while "Simulated Offline Mode" is active. Disable offline simulation first.');
      return;
    }
    const res = await OfflineSyncService.drainQueue({
      updateTaskStatus: async (tId, status, notes, obs) => updateTaskStatus(currentExpeditionId!, tId, status, { notes, fieldObservations: obs }),
      recordCheckIn: async (expId, pId, data) => recordCheckIn(expId, pId, data),
      createIncident: async (expId, data) => fetch(`/api/expeditions/${expId}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('polar_auth_token')}` },
        body: JSON.stringify(data),
      }),
      triggerSos: async (expId, data) => triggerEmergencySos(expId, data),
      createObservation: async (expId, data) => createFieldObservation(expId, data),
    });

    if (res.syncedCount > 0) {
      alert(`Synchronized ${res.syncedCount} queued operational mutations successfully.`);
      loadFieldData();
    }
  };

  // Submit Field Observation
  const handleCreateObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpeditionId || !obsDescription.trim()) return;

    setIsSubmittingObs(true);
    try {
      const payload = {
        category: obsCategory,
        severity: obsSeverity,
        description: obsDescription,
        location: obsLocation || (dashboard?.stationsSummary[0]?.name || 'Field Sector'),
        relatedTaskId: obsRelatedTaskId || undefined,
      };

      if (offlineState.connectivityStatus === 'OFFLINE' || offlineState.simulatedOffline) {
        OfflineSyncService.queueMutation({
          type: 'CREATE_OBSERVATION',
          expeditionId: currentExpeditionId,
          payload,
        });
        alert('Field Observation queued in offline storage. Will synchronize when polar comms reconnect.');
      } else {
        await createFieldObservation(currentExpeditionId, payload);
        alert('Field Observation recorded and evaluated in operational event stream.');
      }

      setObsDescription('');
      setObsLocation('');
      setShowObsModal(false);
      loadFieldData();
    } catch (err: any) {
      alert(`Failed to submit observation: ${err.message}`);
    } finally {
      setIsSubmittingObs(false);
    }
  };

  // Handle Task Status Change
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    if (offlineState.connectivityStatus === 'OFFLINE' || offlineState.simulatedOffline) {
      OfflineSyncService.queueMutation({
        type: 'TASK_STATUS_UPDATE',
        expeditionId: currentExpeditionId!,
        payload: {
          taskId,
          status: newStatus,
          fieldObservations: taskObservation || undefined,
        },
      });
      setTaskObservation('');
      setSelectedTask(null);
      return;
    }

    try {
      await updateTaskStatus(currentExpeditionId!, taskId, newStatus, {
        fieldObservations: taskObservation || undefined,
      });
      setTaskObservation('');
      setSelectedTask(null);
      loadFieldData();
    } catch (e: any) {
      // Fallback to queue if request failed
      OfflineSyncService.queueMutation({
        type: 'TASK_STATUS_UPDATE',
        expeditionId: currentExpeditionId!,
        payload: { taskId, status: newStatus, fieldObservations: taskObservation || undefined },
      });
      setSelectedTask(null);
    }
  };

  // Handle Check-In
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingIn(true);
    const personId = currentUser?.assignedPersonnelId || 'PER-001';

    const payload = {
      status: checkInStatus,
      location: checkInLocation || 'Field Sector Observation Site',
      stationName: dashboard?.stationsSummary[0]?.name || 'Base Station',
      notes: checkInNotes,
    };

    if (offlineState.connectivityStatus === 'OFFLINE' || offlineState.simulatedOffline) {
      OfflineSyncService.queueMutation({
        type: 'PERSONNEL_CHECK_IN',
        expeditionId: currentExpeditionId!,
        payload: {
          personnelId: personId,
          ...payload,
        },
      });
      setLastCheckInTime(new Date().toLocaleTimeString());
      setCheckInNotes('');
      setIsCheckingIn(false);
      return;
    }

    try {
      await recordCheckIn(currentExpeditionId!, personId, payload);
      setLastCheckInTime(new Date().toLocaleTimeString());
      setCheckInNotes('');
    } catch (err: any) {
      OfflineSyncService.queueMutation({
        type: 'PERSONNEL_CHECK_IN',
        expeditionId: currentExpeditionId!,
        payload: { personnelId: personId, ...payload },
      });
      setLastCheckInTime(new Date().toLocaleTimeString());
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Handle Emergency SOS
  const handleTransmitSos = async () => {
    setIsTransmittingSos(true);
    const payload = {
      message: sosMessage || 'DISTRESS BEACON ACTIVATED: Immediate airborne / ground search & rescue required.',
      location: checkInLocation || 'Active Traverse Coordinates',
      latitude: -69.45,
      longitude: 76.15,
    };

    if (offlineState.connectivityStatus === 'OFFLINE' || offlineState.simulatedOffline) {
      OfflineSyncService.queueMutation({
        type: 'EMERGENCY_SOS',
        expeditionId: currentExpeditionId!,
        payload,
      });
      setSosSuccessMessage('SOS beacon queued locally in hardened polar buffer. Will transmit immediately on connection handshake.');
      setIsTransmittingSos(false);
      setTimeout(() => setShowSosModal(false), 3000);
      return;
    }

    try {
      await triggerEmergencySos(currentExpeditionId!, payload);
      setSosSuccessMessage('EMERGENCY SOS BEACON BROADCAST TRANSMITTED. Polar SAR Response Team & Base Station alerted.');
      setTimeout(() => {
        setShowSosModal(false);
        setSosSuccessMessage(null);
        setSosMessage('');
      }, 3500);
    } catch (e: any) {
      OfflineSyncService.queueMutation({
        type: 'EMERGENCY_SOS',
        expeditionId: currentExpeditionId!,
        payload,
      });
      setSosSuccessMessage('Saved to emergency queue. Transmitting on next satellite uplink handshake.');
      setTimeout(() => setShowSosModal(false), 3000);
    } finally {
      setIsTransmittingSos(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTaskFilter === 'ALL') return true;
    if (activeTaskFilter === 'ASSIGNED') return t.status === 'ASSIGNED' || t.status === 'PENDING';
    if (activeTaskFilter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS' || t.status === 'BLOCKED';
    if (activeTaskFilter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner: Member Identity & Offline Resilience Strip */}
      <div className="bg-white text-[#0A192F] rounded-2xl p-5 shadow-2xs border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-sky-50 text-[#0284C7] border border-sky-200 text-[10px] font-extrabold uppercase rounded tracking-wider">
              Field Operations Console
            </span>
            <span className="text-slate-500 text-xs">
              Expedition: <strong className="text-slate-900 font-mono">{currentExpedition?.code || 'Active'}</strong>
            </span>
          </div>
          <h1 className="text-xl font-black text-[#0A192F] tracking-tight mt-1">
            {currentUser?.name || 'Dr. Maya Lin (Field Specialist)'}
          </h1>
          <p className="text-xs text-slate-500">
            Station Assignment: <span className="text-slate-800 font-semibold">{dashboard?.stationsSummary[0]?.name || 'Base Staging Station'}</span> • Role: <span className="text-[#0284C7] font-semibold">Field Expedition Member</span>
          </p>
        </div>

        {/* Connectivity Status Pill & Offline Simulation Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
            offlineState.connectivityStatus === 'ONLINE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : offlineState.connectivityStatus === 'WEAK CONNECTION'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : offlineState.connectivityStatus === 'SYNCING'
              ? 'bg-sky-50 text-sky-700 border-sky-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {offlineState.connectivityStatus === 'OFFLINE' ? (
              <WifiOff className="w-4 h-4 animate-pulse" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            <span>{offlineState.connectivityStatus}</span>
            {offlineState.queuedMutations.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px]">
                {offlineState.queuedMutations.length} queued
              </span>
            )}
          </div>

          {/* Toggle Simulated Offline Mode for Demo */}
          <button
            onClick={() => OfflineSyncService.setSimulatedOffline(!offlineState.simulatedOffline)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              offlineState.simulatedOffline
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-2xs'
            }`}
          >
            {offlineState.simulatedOffline ? 'Disable Offline Mode' : 'Simulate Offline Mode'}
          </button>

          {offlineState.queuedMutations.length > 0 && (
            <button
              onClick={handleManualSync}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-extrabold rounded-xl transition shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Now</span>
            </button>
          )}

          {/* Prominent Red Emergency SOS Button */}
          <button
            onClick={() => setShowSosModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-sm animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency SOS</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column (Tasks & Check-In) / Right Column (Telemetry, Equipment, Location) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Tasks & Check-In */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: MY TASKS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  <span>My Operational Tasks</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Update your assigned mission tasks in real-time or offline
                </p>
              </div>

              {/* Task Status Filters */}
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                {(['ALL', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveTaskFilter(f)}
                    className={`px-2.5 py-1 rounded-md transition ${
                      activeTaskFilter === f ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Cards List */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No mission tasks currently in this filter.
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border transition-all ${
                      t.status === 'COMPLETED'
                        ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                        : t.status === 'BLOCKED'
                        ? 'bg-rose-50/50 border-rose-200'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-sky-50/40 border-sky-200 ring-1 ring-sky-100'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                              t.priority === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-700'
                                : t.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                              t.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'BLOCKED'
                                ? 'bg-rose-100 text-rose-800'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                          {t.location && (
                            <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{t.location}</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                          {t.title}
                        </h3>

                        {t.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        {t.notes && (
                          <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200/50">
                            <strong>Directives:</strong> {t.notes}
                          </div>
                        )}

                        {t.fieldObservations && (
                          <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-md border border-emerald-200/50">
                            <strong>Field Observations:</strong> {t.fieldObservations}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-1.5">
                        {t.status !== 'IN_PROGRESS' && t.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                          >
                            Start Task
                          </button>
                        )}

                        {t.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTask(t);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                            >
                              Complete...
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Please explain what is blocking this task (e.g. ice fracture, blizzard, fuel shortage):');
                                if (reason) {
                                  handleUpdateStatus(t.id, 'BLOCKED');
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                            >
                              Flag Blocked
                            </button>
                          </>
                        )}

                        {t.status === 'BLOCKED' && (
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'IN_PROGRESS')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                          >
                            Unblock / Resume
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Completion Modal / Inline Area */}
                    {selectedTask?.id === t.id && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2 bg-slate-50 p-3 rounded-xl animate-fadeIn">
                        <label className="block text-xs font-semibold text-slate-700">
                          Submit Final Field Observations & Telemetry:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Ice core extracted at 112m. Stratigraphy shows clean firn transition. Density 0.88 g/cm³."
                          value={taskObservation}
                          onChange={(e) => setTaskObservation(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100"
                        ></textarea>
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTask(null)}
                            className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(t.id, 'COMPLETED')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                          >
                            Confirm Task Completion
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: MY CHECK-IN & ACCOUNTABILITY */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Personnel Check-In & Accountability</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Required polar interval check-in. Reports status to Expedition Commander.
                </p>
              </div>

              {lastCheckInTime && (
                <div className="text-[11px] text-slate-500">
                  Last check-in: <strong className="text-slate-800 font-mono">{lastCheckInTime}</strong>
                </div>
              )}
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Operational Status *
                  </label>
                  <select
                    value={checkInStatus}
                    onChange={(e) => setCheckInStatus(e.target.value as CheckInStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                  >
                    <option value="ACTIVE">ACTIVE (On Station / Nominal)</option>
                    <option value="ON_TASK">ON_TASK (Executing Field Mission)</option>
                    <option value="IN_TRANSIT">IN_TRANSIT (Corridor Movement)</option>
                    <option value="RESTING">RESTING (Sleep / Off-Duty)</option>
                    <option value="MEDICAL">MEDICAL (Under Medical Watch)</option>
                    <option value="EMERGENCY">EMERGENCY (Distress / Assistance Needed)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Location / Grid Sector *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Field Camp Fox-3 (70 km S) / Traverse Waypoint 4"
                    value={checkInLocation}
                    onChange={(e) => setCheckInLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Notes / Field Environment Observation (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Surface visibility 8km. Surface drift light. Battery levels 95%."
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Next accountability window: within 12 hours of check-in
                </span>
                <button
                  type="submit"
                  disabled={isCheckingIn}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isCheckingIn ? 'Transmitting Check-In...' : 'Submit Check-In'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Telemetry, Equipment & Field Incident Reporting */}
        <div className="space-y-6">
          {/* Section: REAL OPEN-METEO WEATHER TELEMETRY */}
          <WeatherTelemetryWidget
            weather={weatherReport}
            loading={weatherLoading}
            onRefresh={handleRefreshWeather}
          />

          {/* Section: ACTIVE MOVEMENT IN SECTOR */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-sky-600" />
                <span>Sector Movement & Transits</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                {movements.length} logged
              </span>
            </h2>

            {movements.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
                No active traverse movements in this sector.
              </div>
            ) : (
              <div className="space-y-2">
                {movements.slice(0, 3).map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        {m.movementCode || 'MVT'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.status === 'DELAYED'
                            ? 'bg-rose-100 text-rose-800'
                            : m.status === 'IN_TRANSIT'
                            ? 'bg-sky-100 text-sky-800'
                            : m.status === 'ARRIVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      {m.fromLocation} → {m.toLocation} ({m.transportMode})
                    </div>
                    {m.weatherConstraint && (
                      <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                        {m.weatherConstraint}
                      </div>
                    )}
                    {m.delayHours && m.delayHours > 0 && (
                      <div className="text-[10px] font-bold text-rose-600">
                        Delayed by +{m.delayHours}h
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: FIELD OBSERVATIONS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Binoculars className="w-4 h-4 text-emerald-600" />
                <span>Field Observations</span>
              </h2>
              <button
                onClick={() => setShowObsModal(true)}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition"
              >
                + Record
              </button>
            </div>

            {observations.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                No observations reported yet in this sector.
              </p>
            ) : (
              <div className="space-y-2">
                {observations.slice(0, 3).map((obs) => (
                  <div key={obs.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                        {obs.category}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                          obs.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : obs.severity === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {obs.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] line-clamp-2">{obs.description}</p>
                    <div className="text-[10px] text-slate-400">
                      By {obs.submitterName} • {new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: MY ASSIGNED EQUIPMENT */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Truck className="w-4 h-4 text-sky-600" />
              <span>Assigned Field Equipment</span>
            </h2>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">PistenBully 300 Polar Track (PB-07)</span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">OPERATIONAL</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Health / Battery:</span>
                <span className="font-bold text-slate-800 flex items-center space-x-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-600" />
                  <span>98% Nominal</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Next Service Window:</span>
                <span className="font-mono text-slate-700">1,880 operating hrs remaining</span>
              </div>
            </div>
          </div>

          {/* Section: REPORT FIELD INCIDENT */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Report Field Incident</span>
            </h2>
            <p className="text-xs text-slate-500">
              Encountering vehicle damage, medical issue, or communication failure?
            </p>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Submit Incident Report</span>
            </button>
          </div>

          {/* Section: EMERGENCY FREQUENCIES */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-600" />
              <span>Emergency VHF & Satellite Contacts</span>
            </div>
            {offlineState.emergencyContacts.map((c, i) => (
              <div key={i} className="text-[11px] border-b border-slate-200/50 pb-1.5 last:border-0 last:pb-0">
                <div className="font-semibold text-slate-800">{c.name} ({c.role})</div>
                <div className="font-mono text-sky-700 font-bold">{c.channel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SOS Modal Dialog */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-rose-500 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-rose-100 pb-3">
              <AlertOctagon className="w-8 h-8 animate-bounce" />
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">EMERGENCY SOS BEACON</h3>
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Application-Level Emergency Workflow</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <p className="font-bold">CAUTION: This will immediately dispatch a CRITICAL priority distress alert.</p>
              <p className="text-[11px] text-rose-700">
                Polar Search and Rescue (SAR) protocols will mobilize nearest base station support, vehicles, and medical officers.
              </p>
            </div>

            {sosSuccessMessage ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
                {sosSuccessMessage}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Situation / Message *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe immediate life-safety hazard, injuries, crevasse entrapment, or severe blizzard breakdown..."
                    value={sosMessage}
                    onChange={(e) => setSosMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-200"
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSosModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleTransmitSos}
                    disabled={isTransmittingSos}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition disabled:opacity-50"
                  >
                    {isTransmittingSos ? 'Broadcasting Beacon...' : 'TRANSMIT SOS BEACON'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Field Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Submit Operational Field Incident</h3>
              <button onClick={() => setShowIncidentModal(false)} className="text-slate-400 hover:text-slate-700 text-xs font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Incident Category</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="Vehicle Breakdown">Vehicle Breakdown / Track Detachment</option>
                  <option value="Medical Emergency">Medical Injury / Hypothermia</option>
                  <option value="Cargo Damage">Cargo Breach / Freeze Loss</option>
                  <option value="Communication Failure">VHF / Iridium Signal Outage</option>
                  <option value="Missing Personnel">Personnel Accountability Alert</option>
                  <option value="Other">Other Field Hazard</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. 15 km North of Base along blue traverse corridor"
                  value={incidentLocation}
                  onChange={(e) => setIncidentLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Required Support</label>
                <textarea
                  rows={3}
                  placeholder="Detail the mechanical or medical status..."
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-3 py-1.5 font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const payload = {
                      type: incidentType,
                      location: incidentLocation || 'Field Sector',
                      severity: incidentSeverity,
                      description: incidentDescription,
                      requiredSupport: incidentSupport,
                    };
                    if (offlineState.connectivityStatus === 'OFFLINE' || offlineState.simulatedOffline) {
                      OfflineSyncService.queueMutation({
                        type: 'REPORT_INCIDENT',
                        expeditionId: currentExpeditionId!,
                        payload,
                      });
                      alert('Incident report queued in local buffer. Will transmit once connection restores.');
                    } else {
                      await fetch(`/api/expeditions/${currentExpeditionId}/incidents`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('polar_auth_token')}` },
                        body: JSON.stringify(payload),
                      });
                      alert('Incident logged and dispatched to Commander.');
                    }
                    setShowIncidentModal(false);
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition shadow-xs"
                >
                  Submit Incident
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field Observation Modal */}
      {showObsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Binoculars className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">Record Field Observation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowObsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateObservation} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Observation Category *</label>
                  <select
                    value={obsCategory}
                    onChange={(e) => setObsCategory(e.target.value as ObservationCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                  >
                    <option value="ENVIRONMENT">ENVIRONMENT (Snow/Ice/Weather)</option>
                    <option value="EQUIPMENT">EQUIPMENT (Generators/Vehicles)</option>
                    <option value="SAFETY">SAFETY (Hazards/Crevasses)</option>
                    <option value="CARGO">CARGO (Crates/Storage)</option>
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE (Shelters/Antenna)</option>
                    <option value="PERSONNEL">PERSONNEL (Fatigue/Crew)</option>
                    <option value="ROUTE">ROUTE (Traverse Corridors)</option>
                    <option value="OTHER">OTHER (General Field Notice)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operational Severity *</label>
                  <select
                    value={obsSeverity}
                    onChange={(e) => setObsSeverity(e.target.value as ObservationSeverity)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                  >
                    <option value="LOW">LOW (Informational)</option>
                    <option value="MEDIUM">MEDIUM (Requires Attention)</option>
                    <option value="HIGH">HIGH (Degraded Readiness)</option>
                    <option value="CRITICAL">CRITICAL (Direct Safety Threat)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location / Sector</label>
                <input
                  type="text"
                  placeholder="e.g. North Ridge Traverse, Mile 14"
                  value={obsLocation}
                  onChange={(e) => setObsLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Related Task (Optional)</label>
                <select
                  value={obsRelatedTaskId}
                  onChange={(e) => setObsRelatedTaskId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="">None / Sector Wide Observation</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Observation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Surface temperature drop causing generator fuel line freezing; ice route condition has deteriorated..."
                  value={obsDescription}
                  onChange={(e) => setObsDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowObsModal(false)}
                  className="px-3 py-1.5 font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingObs}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingObs ? 'Recording...' : 'Submit Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Building2,
  Package,
  ShieldAlert,
  Battery,
  Radio,
  MapPin,
  CheckCircle,
  Crosshair,
  Route,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { UnifiedLiveMap } from '../components/map/UnifiedLiveMap';
import { useExpedition } from '../context/ExpeditionContext';
import {
  getExpeditionTrackedPersonnel,
  getExpeditionShipments,
  getExpeditionStations,
  ExpeditionTrackedPerson,
  ExpeditionShipmentTrack,
} from '../services/expeditionService';
import { Station } from '../types';

interface LiveMapPageProps {
  onNavigate?: (path: string) => void;
}

export const LiveMapPage: React.FC<LiveMapPageProps> = ({ onNavigate }) => {
  const {
    expeditions,
    currentExpeditionId,
    currentExpedition,
    switchExpedition,
    dashboard,
    canSwitchExpedition,
    isLoading: isExpLoading,
  } = useExpedition();

  // Active expedition selection state (preserved in localStorage)
  const [selectedExpId, setSelectedExpId] = useState<string>(() => {
    return (
      localStorage.getItem('polar_active_expedition') ||
      currentExpeditionId ||
      expeditions[0]?.id ||
      ''
    );
  });

  // Target to zoom and focus map on
  const [focusedTarget, setFocusedTarget] = useState<{
    id: string;
    type: 'person' | 'station';
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null>(null);

  // Selected personnel details modal
  const [selectedPersonnelModal, setSelectedPersonnelModal] = useState<ExpeditionTrackedPerson | null>(null);

  // Test SOS state for operational demo
  const [testSosOverride, setTestSosOverride] = useState<string | null>(null);

  // Synchronize selected expedition & check URL search params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const expParam = urlParams.get('expedition');
    if (expParam && expeditions.length > 0) {
      const match = expeditions.find(
        (e) =>
          e.id.toLowerCase() === expParam.toLowerCase() ||
          (e.code && e.code.toLowerCase() === expParam.toLowerCase()) ||
          e.title.toLowerCase().includes(expParam.toLowerCase())
      );
      if (match && match.id !== selectedExpId) {
        setSelectedExpId(match.id);
        localStorage.setItem('polar_active_expedition', match.id);
        switchExpedition(match.id);
        return;
      }
    }

    if (!selectedExpId && expeditions.length > 0) {
      const defaultId = currentExpeditionId || expeditions[0].id;
      setSelectedExpId(defaultId);
    }
  }, [expeditions, currentExpeditionId, selectedExpId, switchExpedition]);

  // The active Expedition object
  const activeExpedition = useMemo(() => {
    return (
      expeditions.find((e) => e.id === selectedExpId) ||
      currentExpedition ||
      expeditions[0] ||
      null
    );
  }, [expeditions, selectedExpId, currentExpedition]);

  // Derived telemetry data strictly belonging to the active expedition
  const personnel = useMemo(() => {
    if (!activeExpedition) return [];
    return getExpeditionTrackedPersonnel(activeExpedition);
  }, [activeExpedition]);

  // Support /live-map?personnel=:id or /live-map?expedition=:id&personnel=:id
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const personParam = urlParams.get('personnel');
    if (personParam && personnel.length > 0) {
      const match = personnel.find(
        (p) =>
          p.id.toLowerCase() === personParam.toLowerCase() ||
          p.name.toLowerCase().includes(personParam.toLowerCase())
      );
      if (match) {
        setFocusedTarget({
          id: match.id,
          type: 'person',
          latitude: match.latitude,
          longitude: match.longitude,
          timestamp: Date.now(),
        });
      }
    }
  }, [personnel]);

  const stations = useMemo(() => {
    if (!activeExpedition) return [];
    const allStations = dashboard?.stations || [];
    return getExpeditionStations(activeExpedition, allStations);
  }, [activeExpedition, dashboard?.stations]);

  const shipments = useMemo(() => {
    if (!activeExpedition) return [];
    return getExpeditionShipments(activeExpedition);
  }, [activeExpedition]);

  const waypoints = useMemo(() => {
    return activeExpedition?.route || [];
  }, [activeExpedition]);

  // Identify emergencies strictly belonging to this expedition
  const emergencies = useMemo(() => {
    return personnel.filter(
      (p) => p.isEmergency || p.status === 'Emergency' || testSosOverride === p.id
    );
  }, [personnel, testSosOverride]);

  // Calculate live summary metrics strictly for this expedition
  const connectedCount = useMemo(() => {
    return personnel.filter((p) => p.status === 'Connected').length;
  }, [personnel]);

  const delayedCount = useMemo(() => {
    return personnel.filter((p) => p.status === 'Delayed').length;
  }, [personnel]);

  const activeCount = connectedCount + delayedCount;

  // Handle switching expeditions
  const handleSelectExpedition = (newId: string) => {
    setSelectedExpId(newId);
    localStorage.setItem('polar_active_expedition', newId);
    switchExpedition(newId);
    setFocusedTarget(null);
  };

  // Focus and center map on a specific person
  const handleFocusPerson = (person: ExpeditionTrackedPerson) => {
    setFocusedTarget({
      id: person.id,
      type: 'person',
      latitude: person.latitude,
      longitude: person.longitude,
      timestamp: Date.now(),
    });

    const el = document.getElementById('polar-live-map-viewport');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handle focusing onto personnel from URL query param (?personnel=...)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const personParam = urlParams.get('personnel');
    if (personParam && personnel.length > 0) {
      const target = personnel.find(
        (p) =>
          p.id.toLowerCase() === personParam.toLowerCase() ||
          p.name.toLowerCase().includes(personParam.toLowerCase())
      );
      if (target) {
        handleFocusPerson(target);
      }
    }
  }, [personnel]);

  // Focus and center map on a station
  const handleFocusStation = (st: Station) => {
    setFocusedTarget({
      id: st.id,
      type: 'station',
      latitude: st.latitude,
      longitude: st.longitude,
      timestamp: Date.now(),
    });

    const el = document.getElementById('polar-live-map-viewport');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Toggle demo SOS
  const handleToggleDemoSos = () => {
    if (testSosOverride) {
      setTestSosOverride(null);
    } else {
      const target = personnel.find((p) => p.name === 'Rahul Sharma') || personnel[0];
      if (target) setTestSosOverride(target.id);
    }
  };

  if (!activeExpedition && isExpLoading) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center space-y-4 font-sans">
        <div className="w-10 h-10 border-3 border-sky-200 border-t-[#0284C7] rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">
          Loading expedition telemetry data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans select-none pb-16">
      {/* ------------------------------------------------------------- */}
      {/* PART 1 — EXPEDITION SELECTOR HEADER                           */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#0284C7] uppercase tracking-wider mb-1">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Antarctic Operations Live Map</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Real-Time Expedition Telemetry
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Real-time tracking of expedition personnel and stations across continental sectors.
            </p>
          </div>

          {/* Expedition Dropdown Control */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 min-w-[320px] shadow-2xs">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Operational Scope</span>
              <span className="text-[#0284C7] font-medium">
                {canSwitchExpedition && expeditions.length > 1 ? `${expeditions.length} Available` : 'Assigned Expedition'}
              </span>
            </div>

            {canSwitchExpedition && expeditions.length > 1 ? (
              <div className="relative">
                <select
                  value={selectedExpId}
                  onChange={(e) => handleSelectExpedition(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0284C7] cursor-pointer shadow-2xs"
                >
                  {expeditions.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 shadow-2xs flex items-center justify-between">
                <span className="truncate mr-2">{activeExpedition?.title || 'Assigned Mission'}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200 shrink-0">
                  Assigned Scope
                </span>
              </div>
            )}

            {/* Expedition Status & Counts Strip */}
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-200/70 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {activeExpedition?.status || 'ACTIVE'}
                </span>
              </div>
              <div className="text-slate-500 text-[11px] font-normal">
                Members: <span className="font-semibold text-slate-800">{personnel.length}</span> • Stations:{' '}
                <span className="font-semibold text-slate-800">{stations.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo SOS Trigger & Fast Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleToggleDemoSos}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center space-x-1.5 cursor-pointer text-xs ${
                testSosOverride
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{testSosOverride ? 'Distress Signal Active' : 'Simulate SOS Signal'}</span>
            </button>
            <span className="text-[11px] text-slate-400 hidden sm:inline font-normal">
              (Demonstrates immediate distress notification & GPS map focus)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/stations')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer flex items-center space-x-1"
            >
              <Building2 className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Stations Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 5 — SELECTED EXPEDITION SUMMARY CARDS                    */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* PERSONNEL */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="uppercase tracking-wider text-[11px] font-medium">Personnel</span>
            <Users className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{personnel.length}</div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
            {connectedCount} connected • {delayedCount} delayed
          </div>
        </div>

        {/* STATIONS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="uppercase tracking-wider text-[11px] font-medium">Stations</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stations.length}</div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">
            {stations.map((s) => s.code || s.name).join(' & ') || 'No base stations'}
          </div>
        </div>

        {/* ACTIVE */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="uppercase tracking-wider text-[11px] font-medium">Active</span>
            <Radio className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {activeCount > 0 ? 'Live telemetry signals' : 'Standby mode'}
          </div>
        </div>

        {/* EMERGENCIES */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span className="uppercase tracking-wider text-[11px] font-medium">Emergencies</span>
            <ShieldAlert
              className={`w-4 h-4 ${
                emergencies.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'
              }`}
            />
          </div>
          <div
            className={`text-2xl font-bold ${
              emergencies.length > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {emergencies.length}
          </div>
          <div
            className={`text-[11px] font-medium mt-0.5 ${
              emergencies.length > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {emergencies.length > 0 ? 'Active Distress Beacon' : 'All Clear Nominal'}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 7 — PROMINENT ACTIVE EMERGENCY BANNER                     */}
      {/* ------------------------------------------------------------- */}
      {emergencies.length > 0 ? (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                    🚨 Active Emergency
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-600 text-white animate-pulse">
                    Priority Distress
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                  {emergencies[0].name}
                </h3>
                <div className="text-xs text-rose-800 font-medium">
                  {emergencies[0].role}
                </div>
                <p className="text-xs text-rose-900 mt-1 font-normal">
                  {emergencies[0].emergencyMessage ||
                    'Crevasse / Traverse hazard detected. Field response alert active.'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleFocusPerson(emergencies[0])}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Crosshair className="w-4 h-4" />
                <span>Focus on Map</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPersonnelModal(emergencies[0])}
                className="px-4 py-2 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                View Personnel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-rose-200 text-xs">
            <div>
              <span className="text-[11px] text-rose-600 uppercase font-semibold">
                Last Known Location:
              </span>
              <div className="font-semibold text-slate-800 truncate mt-0.5">
                {emergencies[0].locationName}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-rose-600 uppercase font-semibold">Last Signal:</span>
              <div className="font-semibold text-slate-800 mt-0.5">{emergencies[0].lastUpdateText}</div>
            </div>
            <div>
              <span className="text-[11px] text-rose-600 uppercase font-semibold">
                Transceiver Battery:
              </span>
              <div className="font-semibold text-rose-700 mt-0.5">
                {emergencies[0].battery}% (Critical Low)
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Nominal Operational Telemetry</span>
            <span className="text-emerald-700 font-normal">
              • 🟢 No active distress signals in {activeExpedition?.title}
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded font-medium">
            Beacon Watch: Nominal
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PART 2 & 3 — THE EXPEDITION-SPECIFIC LIVE MAP                 */}
      {/* ------------------------------------------------------------- */}
      <div id="polar-live-map-viewport">
        {activeExpedition ? (
          <UnifiedLiveMap
            selectedExpedition={activeExpedition}
            personnel={personnel}
            stations={stations}
            shipments={shipments}
            waypoints={waypoints}
            activeSosId={testSosOverride || (emergencies[0]?.id ?? null)}
            focusedTarget={focusedTarget}
            onSelectPerson={(p) => setSelectedPersonnelModal(p)}
            onSelectStation={(st) => handleFocusStation(st)}
            onViewStationProfile={(stId) => onNavigate && onNavigate('/stations')}
            onViewPersonProfile={(pId) => {
              const p = personnel.find((item) => item.id === pId);
              if (p) setSelectedPersonnelModal(p);
            }}
            className="h-[620px] w-full"
          />
        ) : (
          <div className="h-[400px] flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-500">
            Select an expedition to display operational map.
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 6 — EXPEDITION PERSONNEL LIST BELOW MAP                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase font-semibold tracking-wider text-[#0284C7]">
              Selected Expedition Field Team
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 uppercase tracking-wider mt-0.5">
              Expedition Personnel ({personnel.length})
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Only personnel assigned to <span className="font-medium text-slate-700">{activeExpedition?.title}</span> are shown below.
            </p>
          </div>

          <span className="text-xs font-medium text-[#0284C7] bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 self-start sm:self-auto font-mono">
            {personnel.length} Team Members Listed
          </span>
        </div>

        {personnel.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-normal">
            No personnel assigned to this expedition yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
            {personnel.map((person) => {
              const isEmergency = Boolean(
                person.isEmergency || person.status === 'Emergency' || testSosOverride === person.id
              );
              const isDelayed = person.status === 'Delayed';
              const isOffline = person.status === 'Offline';

              return (
                <div
                  key={person.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/80 ${
                    isEmergency ? 'bg-rose-50/70 border-l-4 border-l-rose-600' : ''
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900">{person.name}</span>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium tracking-wide ${
                          isEmergency
                            ? 'bg-rose-600 text-white animate-pulse'
                            : isDelayed
                            ? 'bg-amber-100 text-amber-800'
                            : isOffline
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isEmergency
                          ? '🔴 Emergency'
                          : person.status === 'Connected'
                          ? '🟢 Connected'
                          : isDelayed
                          ? '🟡 Location Delayed'
                          : '⚫ Offline'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#0284C7]">{person.role}</div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 font-normal">
                      <span>
                        Location: <span className="font-medium text-slate-800">{person.locationName}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Battery
                          className={`w-3.5 h-3.5 ${
                            person.battery < 20 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        />
                        Battery:{' '}
                        <span className={person.battery < 20 ? 'text-rose-600 font-semibold' : 'text-slate-800 font-medium'}>
                          {person.battery}%
                        </span>
                      </span>
                      <span>•</span>
                      <span>
                        Last Update: <span className="font-medium text-slate-800">{person.lastUpdateText}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleFocusPerson(person)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>View on Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPersonnelModal(person)}
                      className="px-3.5 py-2 bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PERSONNEL PROFILE MODAL                                       */}
      {/* ------------------------------------------------------------- */}
      {selectedPersonnelModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#0284C7]">
                  Personnel Dossier
                </span>
                <h3 className="text-xl font-semibold text-slate-900 mt-0.5">
                  {selectedPersonnelModal.name}
                </h3>
                <div className="text-xs text-slate-500 font-medium">
                  {selectedPersonnelModal.role}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPersonnelModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Current Status:
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedPersonnelModal.isEmergency
                      ? '🔴 Emergency Distress'
                      : selectedPersonnelModal.status}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Transceiver Battery:
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedPersonnelModal.battery}%
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Assigned Base:
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedPersonnelModal.stationName}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Last Signal:
                  </span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedPersonnelModal.lastUpdateText}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-slate-400 uppercase font-medium text-[11px]">Field Location:</div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-800">
                  <div className="font-semibold">{selectedPersonnelModal.locationName}</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5 font-normal">
                    GPS: {selectedPersonnelModal.latitude.toFixed(3)}° S,{' '}
                    {selectedPersonnelModal.longitude.toFixed(3)}° E
                    {selectedPersonnelModal.elevationMeters
                      ? ` • ${selectedPersonnelModal.elevationMeters}m Elevation`
                      : ''}
                  </div>
                </div>
              </div>

              {selectedPersonnelModal.assignedEquipment &&
                selectedPersonnelModal.assignedEquipment.length > 0 && (
                  <div>
                    <div className="text-slate-400 uppercase font-medium text-[11px] mb-1">
                      Assigned Field Gear:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedPersonnelModal.assignedEquipment.map((eq, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0284C7] font-medium text-[11px] border border-sky-100"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {selectedPersonnelModal.contactFrequency && (
                <div className="flex items-center space-x-1.5 text-slate-500 pt-1 font-normal">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Comms Frequency:{' '}
                    <span className="font-semibold text-slate-800">
                      {selectedPersonnelModal.contactFrequency}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  handleFocusPerson(selectedPersonnelModal);
                  setSelectedPersonnelModal(null);
                }}
                className="flex-1 py-2 bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Crosshair className="w-4 h-4" />
                <span>Center On Map</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPersonnelModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

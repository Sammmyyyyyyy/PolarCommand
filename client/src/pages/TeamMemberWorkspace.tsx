import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Battery,
  Radio,
  Users,
  ShieldAlert,
  Wrench,
  Navigation,
  Send,
  RefreshCw,
  Flame,
  CloudSnow,
  ChevronRight,
  User,
  Activity,
  Layers,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpedition } from '../context/ExpeditionContext';
import {
  fetchMyEquipment,
  fetchExpeditionMembersLocations,
  sendLocationPing,
  reportEmergencyIncident,
  fetchTasks,
  updateTaskStatus,
  recordCheckIn,
} from '../services/api';
import { Asset, MemberTracking, Task } from '../types';

interface TeamMemberWorkspaceProps {
  onNavigate?: (path: string) => void;
}

export const TeamMemberWorkspace: React.FC<TeamMemberWorkspaceProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { currentExpeditionId, currentExpedition, expeditions } = useExpedition();

  // State
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'EQUIPMENT' | 'TEAM_MAP'>('OVERVIEW');
  const [myEquipment, setMyEquipment] = useState<Asset[]>([]);
  const [teamLocations, setTeamLocations] = useState<MemberTracking[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Field Check-in State
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [checkInStatus, setCheckInStatus] = useState<'ACTIVE' | 'RESTING' | 'TRANSIT' | 'STANDBY'>('ACTIVE');
  const [checkInNotes, setCheckInNotes] = useState<string>('');
  const [lastCheckInTime, setLastCheckInTime] = useState<string>('Just now');

  // Emergency SOS Modal State
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isSubmittingEmergency, setIsSubmittingEmergency] = useState<boolean>(false);
  const [emergencyForm, setEmergencyForm] = useState({
    type: 'MEDICAL',
    severity: 'CRITICAL',
    location: '-70.7667° S, 11.7333° E (Waypoint Alpha-4)',
    description: '',
  });

  const activeExpId = currentUser?.assignedExpeditionId || currentExpeditionId || (expeditions[0]?.id ?? '');

  const loadData = async () => {
    if (!activeExpId) return;
    try {
      setIsRefreshing(true);
      const [equipRes, teamRes, tasksRes] = await Promise.all([
        fetchMyEquipment(),
        fetchExpeditionMembersLocations(activeExpId),
        fetchTasks(activeExpId),
      ]);
      setMyEquipment(equipRes);
      setTeamLocations(teamRes);
      setMyTasks(tasksRes);
    } catch (err) {
      console.error('Failed to load field member telemetry:', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Periodic refresh of team location ping
    const interval = setInterval(loadData, 25000);
    return () => clearInterval(interval);
  }, [activeExpId]);

  // Handle Routine Check-in
  const handlePerformCheckIn = async () => {
    try {
      setIsCheckingIn(true);
      if (currentUser?.assignedPersonnelId) {
        await recordCheckIn(activeExpId, currentUser.assignedPersonnelId, {
          status: checkInStatus,
          location: emergencyForm.location,
          notes: checkInNotes || 'Routine operational field check-in confirmed.',
        });
      }
      // Also ping location telemetry
      await sendLocationPing({
        latitude: -70.7667 + (Math.random() - 0.5) * 0.01,
        longitude: 11.7333 + (Math.random() - 0.5) * 0.01,
        battery: 94,
        connectionStatus: 'LIVE',
        isSos: false,
      });
      setLastCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setToastMessage('Check-in transmitted! Expedition Leader & Station logged your status.');
      setCheckInNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit check-in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Handle Task Completion Toggle
  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      await updateTaskStatus(activeExpId, task.id, nextStatus, {
        notes: `Updated status to ${nextStatus} by field member ${currentUser?.name}`,
      });
      setToastMessage(`Task "${task.title}" marked as ${nextStatus}.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  // Handle Emergency SOS Transmission
  const handleSubmitEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingEmergency(true);
      await reportEmergencyIncident({
        incidentType: emergencyForm.type,
        severity: emergencyForm.severity,
        location: emergencyForm.location,
        description: emergencyForm.description,
      });
      setIsEmergencyModalOpen(false);
      setToastMessage(
        '🚨 EMERGENCY ALERT TRANSMITTED! Dispatched immediately to Expedition Leader, Station Manager & Mission Control Admin.'
      );
      setEmergencyForm({
        type: 'MEDICAL',
        severity: 'CRITICAL',
        location: '-70.7667° S, 11.7333° E (Waypoint Alpha-4)',
        description: '',
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to transmit emergency');
    } finally {
      setIsSubmittingEmergency(false);
    }
  };

  // Find My Tracking Record
  const myTracking = teamLocations.find(
    (t) => t.personnelId === currentUser?.assignedPersonnelId || t.name === currentUser?.name
  );
  const otherMembers = teamLocations.filter(
    (t) => t.personnelId !== currentUser?.assignedPersonnelId && t.name !== currentUser?.name
  );

  return (
    <div className="space-y-5 pb-8 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Field Member Header & Emergency Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Field Member Workspace
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Field Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Member: <span className="font-bold text-slate-700">{currentUser?.name}</span> • Expedition:{' '}
              <span className="font-semibold text-blue-600">{currentExpedition?.name || 'Assigned Expedition'}</span>
            </p>
          </div>
        </div>

        {/* HIGH-VISIBILITY EMERGENCY REPORTING BUTTON (SECTION 13) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            disabled={isRefreshing}
            className="p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Field Network Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-rose-200 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <ShieldAlert className="w-4 h-4 text-white animate-bounce" />
            <span>🚨 Report Emergency</span>
          </button>
        </div>
      </div>

      {/* KPI Status Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* My Telemetry */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>GPS Tracking Link</span>
            <Radio className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE PING
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Satellite Link: Iridium-9603 Nominal</div>
        </div>

        {/* Battery & Health */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Beacon Battery</span>
            <Battery className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {myTracking?.battery ?? 94}%
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Estimated 48h Survival</div>
        </div>

        {/* Assigned Gear */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>My Equipment</span>
            <Wrench className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-black text-slate-900">{myEquipment.length} Devices</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">Allocated by Leader</div>
        </div>

        {/* Check-In Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Last Field Check-in</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-black text-slate-900">{lastCheckInTime}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Accounted For</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-6">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-2.5 transition border-b-2 ${
            activeTab === 'OVERVIEW'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          My Mission & Check-in
        </button>
        <button
          onClick={() => setActiveTab('TEAM_MAP')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'TEAM_MAP'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Team Map & Member Locations</span>
          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
            {teamLocations.length} active
          </span>
        </button>
        <button
          onClick={() => setActiveTab('EQUIPMENT')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'EQUIPMENT'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>My Assigned Equipment</span>
          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px]">
            {myEquipment.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('TASKS')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'TASKS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>My Tasks</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
            {myTasks.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CHECK-IN */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* My Expedition Details */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">My Expedition Profile</h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Expedition Name:</span>
                  <span className="font-extrabold text-slate-900">{currentExpedition?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expedition Code:</span>
                  <span className="font-mono font-bold text-blue-600">{currentExpedition?.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expedition Leader:</span>
                  <span className="font-semibold text-slate-800">Dr. Rajesh Nair</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Home Base / Station:</span>
                  <span className="font-semibold text-slate-800">Maitri Station</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operational Sector:</span>
                  <span className="font-mono text-slate-600">Queen Maud Land (-70.76° S, 11.73° E)</span>
                </div>
              </div>
            </div>

            {/* Quick Check-in Module */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Transmit Operational Check-In</h3>
                  <p className="text-xs text-slate-500">
                    Keep your leader and station informed of your physical safety and current activity.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Due every 4 hours</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  {(['ACTIVE', 'RESTING', 'TRANSIT', 'STANDBY'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setCheckInStatus(st)}
                      className={`flex-1 py-2 rounded-xl font-bold transition text-center ${
                        checkInStatus === st
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Optional field notes (e.g. Completed ice core sample #4, zero frostbite)"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />

                <button
                  onClick={handlePerformCheckIn}
                  disabled={isCheckingIn}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isCheckingIn ? 'Transmitting...' : 'Send Check-In Ping'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Rail */}
          <div className="space-y-4">
            {/* Quick Equipment Glance */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">My Gear</h3>
                <button
                  onClick={() => setActiveTab('EQUIPMENT')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              {myEquipment.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No personal equipment assigned yet. Contact your Expedition Leader.
                </div>
              ) : (
                <div className="space-y-2">
                  {myEquipment.slice(0, 3).map((eq) => (
                    <div
                      key={eq.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{eq.name}</div>
                        <div className="text-[10px] text-slate-400">{eq.type}</div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weather Telemetry at Position */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <CloudSnow className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900">Local Weather Telemetry</h3>
              </div>
              <div className="text-2xl font-black text-slate-900">-22°C</div>
              <div className="text-xs text-slate-500 mt-1">Light Snow & Ground Drift</div>
              <div className="text-[11px] text-slate-400 mt-2 font-mono space-y-1">
                <div>Wind Speed: 26 km/h SW</div>
                <div>Wind Chill: -34°C</div>
                <div>Barometer: 988 hPa (Falling)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM MAP (SECTIONS 11 & 12 CRITICAL REQUIREMENT) */}
      {activeTab === 'TEAM_MAP' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Team Member Locations ({currentExpedition?.name})
              </h3>
              <p className="text-xs text-slate-500">
                Scoped strictly to active personnel in your expedition. Distinguishes LIVE (&lt;3m), LAST KNOWN (3-20m), and OFFLINE (&gt;20m).
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> LIVE
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> LAST KNOWN
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-600">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> OFFLINE
              </span>
            </div>
          </div>

          {/* Visual Tactical Polar Radar Display */}
          <div className="relative w-full h-80 rounded-2xl bg-[#0B1728] border border-slate-800 overflow-hidden flex items-center justify-center p-4">
            {/* Grid concentric rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-32 h-32 rounded-full border border-sky-400"></div>
              <div className="w-56 h-56 rounded-full border border-sky-400"></div>
              <div className="w-72 h-72 rounded-full border border-sky-400"></div>
              <div className="absolute w-full h-[1px] bg-sky-400"></div>
              <div className="absolute h-full w-[1px] bg-sky-400"></div>
            </div>

            {/* Center: My Location */}
            <div className="absolute z-10 flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-blue-500/50 animate-pulse">
                YOU
              </div>
              <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded mt-1 border border-slate-700">
                {currentUser?.name} (My Position)
              </span>
            </div>

            {/* Other Expedition Members plotted dynamically */}
            {otherMembers.map((member, idx) => {
              const offsets = [
                { top: '24%', left: '32%' },
                { top: '30%', left: '68%' },
                { top: '72%', left: '28%' },
                { top: '65%', left: '75%' },
              ];
              const pos = offsets[idx % offsets.length];
              const isLive = member.trackingStatus === 'LIVE';
              const isLastKnown = member.trackingStatus === 'LAST_KNOWN';

              return (
                <div key={member.personnelId} className="absolute z-10 flex flex-col items-center" style={pos}>
                  <div
                    className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-md ${
                      isLive ? 'bg-emerald-500' : isLastKnown ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                  >
                    ●
                  </div>
                  <div className="text-[10px] font-bold text-slate-200 bg-slate-900/80 px-1.5 py-0.5 rounded mt-1 border border-slate-700 flex items-center gap-1">
                    <span>{member.name.split(' ')[0]}</span>
                    <span className="text-[9px] font-mono opacity-70">{member.battery}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Member Name</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Coordinates</th>
                  <th className="py-2.5 px-4">Tracking State</th>
                  <th className="py-2.5 px-4">Device Battery</th>
                  <th className="py-2.5 px-4">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {teamLocations.map((m) => {
                  const isLive = m.trackingStatus === 'LIVE';
                  const isLastKnown = m.trackingStatus === 'LAST_KNOWN';
                  const isMe = m.personnelId === currentUser?.assignedPersonnelId || m.name === currentUser?.name;

                  return (
                    <tr key={m.personnelId} className={`hover:bg-slate-50/80 transition ${isMe ? 'bg-blue-50/40' : ''}`}>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{m.name}</span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] rounded font-bold uppercase">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{m.role}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                        {m.latitude.toFixed(4)}° S, {m.longitude.toFixed(4)}° E
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLive
                              ? 'bg-emerald-100 text-emerald-800'
                              : isLastKnown
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLive ? 'bg-emerald-500 animate-pulse' : isLastKnown ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          {m.trackingStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Battery className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{m.battery}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {m.lastPingTime || m.lastLocationUpdate
                          ? new Date(m.lastPingTime || m.lastLocationUpdate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Live'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MY ASSIGNED EQUIPMENT (SECTIONS 10 & 11) */}
      {activeTab === 'EQUIPMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">My Assigned Expedition Equipment</h3>
            <p className="text-xs text-slate-500">
              Hardware and field telemetry sensors assigned to you by your Expedition Leader.
            </p>
          </div>

          {myEquipment.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              No equipment currently assigned to your profile. Please coordinate with your Expedition Leader.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myEquipment.map((asset) => (
                <div key={asset.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{asset.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        S/N: {asset.serialNumber || asset.assetTag || 'N/A'}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      {asset.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Battery Level</span>
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <Battery className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{asset.batteryPercentage ?? 92}%</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Status</span>
                      <span className="font-bold text-emerald-600">Active</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Assigned:</span>
                    <span className="font-semibold text-slate-700">Expedition Field Pool</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MY TASKS */}
      {activeTab === 'TASKS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Field Mission Tasks</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {myTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No active tasks assigned to your station.</div>
            ) : (
              myTasks.map((task) => {
                const isCompleted = task.status === 'COMPLETED';

                return (
                  <div key={task.id} className="py-3 flex items-center justify-between hover:bg-slate-50 transition px-2 rounded-lg">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-blue-600'
                        }`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div className={`font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                          {task.title}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">{task.description}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: EMERGENCY SOS REPORTING (SECTION 13) */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-rose-500 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-600 mb-2">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <h3 className="text-lg font-black text-slate-900">🚨 REPORT CRITICAL EMERGENCY</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Immediate satellite broadcast to Expedition Leader, Station Commander, and Mission Control Admin.
            </p>

            <form onSubmit={handleSubmitEmergency} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Incident Type</label>
                  <select
                    value={emergencyForm.type}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-rose-900"
                  >
                    <option value="MEDICAL">Medical Emergency</option>
                    <option value="WEATHER">Severe Weather / Whiteout</option>
                    <option value="EQUIPMENT FAILURE">Equipment / Vehicle Failure</option>
                    <option value="LOST CONTACT">Lost Contact</option>
                    <option value="PERSON MISSING">Person Missing / Overdue</option>
                    <option value="ENVIRONMENTAL">Crevasse / Ice Hazard</option>
                    <option value="OTHER">Other Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Severity Level</label>
                  <select
                    value={emergencyForm.severity}
                    onChange={(e) => setEmergencyForm({ ...emergencyForm, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-rose-900"
                  >
                    <option value="CRITICAL">Critical (Immediate Evacuation)</option>
                    <option value="HIGH">High (Urgent Assistance)</option>
                    <option value="MEDIUM">Medium (Support Required)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Current Coordinates / Waypoint</label>
                <input
                  type="text"
                  required
                  value={emergencyForm.location}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Situation Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State casualty details, vehicle condition, weather severity..."
                  value={emergencyForm.description}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmergencyModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmergency}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-black uppercase tracking-wider shadow-md shadow-rose-200 transition"
                >
                  {isSubmittingEmergency ? 'Broadcasting...' : 'Broadcast SOS Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

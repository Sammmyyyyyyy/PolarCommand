import React, { useState, useEffect } from 'react';
import {
  Compass,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  Battery,
  Radio,
  Plus,
  ArrowUpRight,
  Filter,
  Search,
  ChevronRight,
  Wrench,
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  CloudSnow,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpedition } from '../context/ExpeditionContext';
import {
  fetchPersonnel,
  fetchEquipment,
  assignEquipment,
  unassignEquipment,
  fetchTasks,
  createTask,
  updateTaskStatus,
  fetchCargo,
  fetchIncidents,
  fetchAlerts,
} from '../services/api';
import { Personnel, Asset, Task, CargoShipment, Incident, Alert } from '../types';

interface ExpeditionLeaderDashboardProps {
  onNavigate?: (path: string) => void;
}

export const ExpeditionLeaderDashboard: React.FC<ExpeditionLeaderDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { currentExpeditionId, currentExpedition, dashboard, switchExpedition, expeditions } = useExpedition();

  // State
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EQUIPMENT' | 'TEAM' | 'TASKS' | 'CARGO' | 'INCIDENTS'>('OVERVIEW');
  const [teamMembers, setTeamMembers] = useState<Personnel[]>([]);
  const [equipmentList, setEquipmentList] = useState<Asset[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [cargoList, setCargoList] = useState<CargoShipment[]>([]);
  const [incidentsList, setIncidentsList] = useState<Incident[]>([]);
  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Equipment Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState<boolean>(false);
  const [equipmentFilter, setEquipmentFilter] = useState<'ALL' | 'ASSIGNED' | 'AVAILABLE'>('ALL');

  // Task Creation State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedToId: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
  });

  const activeExpId = currentExpeditionId || (expeditions[0]?.id ?? '');

  const loadData = async (expId: string) => {
    if (!expId) return;
    try {
      setIsRefreshing(true);
      const [people, equip, tasks, cargo, inc, alerts] = await Promise.all([
        fetchPersonnel(expId),
        fetchEquipment({ expeditionId: expId }),
        fetchTasks(expId),
        fetchCargo(expId),
        fetchIncidents(expId),
        fetchAlerts(expId),
      ]);
      setTeamMembers(people);
      setEquipmentList(equip);
      setTasksList(tasks);
      setCargoList(cargo);
      setIncidentsList(inc);
      setAlertsList(alerts);
    } catch (err) {
      console.error('Failed to load expedition leader data:', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeExpId) {
      loadData(activeExpId);
    }
  }, [activeExpId]);

  // Handle Equipment Assignment
  const handleOpenAssignModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setSelectedMemberId(teamMembers[0]?.id || '');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !selectedMemberId) return;

    try {
      setIsSubmittingAssign(true);
      const member = teamMembers.find((m) => m.id === selectedMemberId);
      await assignEquipment(selectedAsset.id, {
        personnelId: selectedMemberId,
        personnelName: member?.name || 'Team Member',
      });
      setToastMessage(
        `Assigned ${selectedAsset.name} to ${member?.name || 'team member'}. Syncing field tracking.`
      );
      setIsAssignModalOpen(false);
      setSelectedAsset(null);
      await loadData(activeExpId);
    } catch (err: any) {
      alert(err.message || 'Failed to assign equipment');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Handle Unassignment
  const handleUnassign = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to unassign ${asset.name} from current user?`)) return;
    try {
      setIsRefreshing(true);
      await unassignEquipment(asset.id);
      setToastMessage(`Unassigned ${asset.name}. Equipment is now AVAILABLE in inventory pool.`);
      await loadData(activeExpId);
    } catch (err: any) {
      alert(err.message || 'Failed to unassign equipment');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsRefreshing(true);
      await createTask(activeExpId, {
        title: taskForm.title,
        description: taskForm.description,
        assignedToId: taskForm.assignedToId || undefined,
        priority: taskForm.priority,
        dueDate: new Date(taskForm.dueDate).toISOString(),
      });
      setToastMessage(`New mission task "${taskForm.title}" assigned successfully.`);
      setIsTaskModalOpen(false);
      setTaskForm({
        title: '',
        description: '',
        assignedToId: '',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      });
      await loadData(activeExpId);
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered Equipment
  const filteredEquipment = equipmentList.filter((item) => {
    if (equipmentFilter === 'ASSIGNED') return !!item.assignedPersonnelId || item.lifecycleStatus === 'ASSIGNED';
    if (equipmentFilter === 'AVAILABLE') return !item.assignedPersonnelId && item.lifecycleStatus !== 'ASSIGNED';
    return true;
  });

  const availableCount = equipmentList.filter((i) => !i.assignedPersonnelId && i.lifecycleStatus !== 'ASSIGNED').length;
  const assignedCount = equipmentList.filter((i) => !!i.assignedPersonnelId || i.lifecycleStatus === 'ASSIGNED').length;

  if (isLoading && !currentExpedition) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs font-semibold">Synchronizing with Expedition Telemetry Network...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 font-sans">
      {/* Toast */}
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {currentExpedition?.name || 'Polar Expedition'} Command
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                {currentExpedition?.status || 'Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mission: <span className="font-semibold text-slate-700">{currentExpedition?.title || currentExpedition?.name || 'Active Mission'}</span> • Leader:{' '}
              <span className="font-semibold text-slate-700">{currentUser?.name}</span>
            </p>
          </div>
        </div>

        {/* Expedition Selector (if leader has multiple) & Refresh */}
        <div className="flex items-center gap-2">
          {expeditions.length > 1 && (
            <select
              value={activeExpId}
              onChange={(e) => switchExpedition(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-semibold text-slate-700 hover:bg-slate-100 focus:outline-hidden"
            >
              {expeditions.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.title || exp.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => loadData(activeExpId)}
            disabled={isRefreshing}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Field Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('EQUIPMENT')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Assign Equipment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Risk Index */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Expedition Risk</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {dashboard?.kpi.overallRisk ?? currentExpedition?.overallRisk ?? 35} / 100
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">Nominal Operational Risk</div>
        </div>

        {/* Team Accountability */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Field Team Roster</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{teamMembers.length} Members</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="text-emerald-600 font-semibold">100% Checked-In</span>
            <span className="font-mono text-slate-400">All Live</span>
          </div>
        </div>

        {/* Assigned Equipment */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Field Equipment</span>
            <Wrench className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{equipmentList.length} Units</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="font-bold text-blue-600">{assignedCount} Assigned</span>
            <span className="text-slate-400">{availableCount} in Pool</span>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Mission Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{tasksList.length} Tasks</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Completed:</span>
            <span className="font-bold text-emerald-600">
              {tasksList.filter((t) => t.status === 'COMPLETED').length} / {tasksList.length}
            </span>
          </div>
        </div>

        {/* Cargo Inbound */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Expedition Cargo</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{cargoList.length} Shipments</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>In Transit</span>
            <span className="text-blue-600 font-bold">
              {cargoList.filter((c) => c.status === 'IN_TRANSIT').length} En Route
            </span>
          </div>
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
          Expedition Overview
        </button>
        <button
          onClick={() => setActiveTab('EQUIPMENT')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'EQUIPMENT'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Equipment Assignment</span>
          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px]">
            {equipmentList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('TEAM')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'TEAM'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Team Roster & Roles</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
            {teamMembers.length}
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
          <span>Task Delegation</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
            {tasksList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('CARGO')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'CARGO'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Cargo & Logistical Assets</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
            {cargoList.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mission Objectives & Field Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Expedition Route & Milestones</h3>
              <p className="text-xs text-slate-500 mb-4">
                Primary Objective: {currentExpedition?.description || 'Deep ice-core acoustic profiling and sub-glacial seismic telemetry.'}
              </p>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Traverse Progress</span>
                  <span className="font-bold text-blue-600 font-mono">68% / 450 km</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '68%' }}></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Start: Maitri Base</span>
                  <span>Waypoint 3: Queen Maud Ridge</span>
                  <span>Destination: Amundsen Ice Dome</span>
                </div>
              </div>
            </div>

            {/* Quick Team Roster Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Expedition Personnel Accountability</h3>
                <button
                  onClick={() => setActiveTab('TEAM')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Manage Roster
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{member.name}</div>
                        <div className="text-[10px] text-slate-400">{member.role}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      LIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Rail */}
          <div className="space-y-4">
            {/* Quick Action: Assign Equipment */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Equipment Pool Quick Assign</h3>
              <p className="text-xs text-slate-500 mb-3">
                {availableCount} items currently available in the expedition pool ready for team allocation.
              </p>
              <button
                onClick={() => setActiveTab('EQUIPMENT')}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center justify-center gap-2"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Open Equipment Manager</span>
              </button>
            </div>

            {/* Simulation Quick Launcher */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <SlidersHorizontal className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900">What-If Mission Simulation</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Simulate severe weather or traverse delay impacts on fuel burn and crew survival margins.
              </p>
              <button
                onClick={() => onNavigate && onNavigate('/simulations')}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Launch What-If Engine</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EQUIPMENT ASSIGNMENT (SECTION 10 MAJOR REQUIREMENT) */}
      {activeTab === 'EQUIPMENT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expedition Equipment Assignment</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign satellite beacons, GPS units, and scientific sensors to expedition personnel.
              </p>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setEquipmentFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  equipmentFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Equipment ({equipmentList.length})
              </button>
              <button
                onClick={() => setEquipmentFilter('AVAILABLE')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  equipmentFilter === 'AVAILABLE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Available ({availableCount})
              </button>
              <button
                onClick={() => setEquipmentFilter('ASSIGNED')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  equipmentFilter === 'ASSIGNED'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Assigned ({assignedCount})
              </button>
            </div>
          </div>

          {/* Equipment Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Equipment / Serial #</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Currently Assigned To</th>
                  <th className="py-3 px-4">Battery / Health</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No equipment units match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map((asset) => {
                    const isAssigned = !!asset.assignedPersonnelId || asset.lifecycleStatus === 'ASSIGNED';
                    const assignedPersonnel = teamMembers.find((m) => m.id === asset.assignedPersonnelId);
                    const displayName = assignedPersonnel?.name || (isAssigned ? 'Assigned Field Member' : null);

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{asset.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {asset.type}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {asset.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                              <UserCheck className="w-3 h-3 text-blue-600" />
                              ACTIVE (ASSIGNED)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              AVAILABLE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isAssigned ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                                {displayName ? displayName.slice(0, 2).toUpperCase() : 'TM'}
                              </div>
                              <span className="font-bold text-slate-900">{displayName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned (In Depot)</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Battery className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-bold text-slate-800">
                              {asset.batteryPercentage ?? 92}%
                            </span>
                            <span className="text-slate-400">• Nominal</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isAssigned ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenAssignModal(asset)}
                                className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-[11px] font-semibold transition"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => handleUnassign(asset)}
                                className="px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg text-[11px] font-bold transition"
                              >
                                Unassign
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenAssignModal(asset)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[11px] font-bold shadow-2xs transition"
                            >
                              Assign Equipment
                            </button>
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
      )}

      {/* TAB 3: TEAM ROSTER */}
      {activeTab === 'TEAM' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expedition Field Team</h3>
              <p className="text-xs text-slate-500">
                Roster of personnel currently active in {currentExpedition?.name}.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">{teamMembers.length} field members</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => {
              const assignedEquip = equipmentList.filter((e) => e.assignedPersonnelId === member.id);

              return (
                <div key={member.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{member.name}</div>
                        <div className="text-[10px] text-slate-400">{member.role}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      LIVE
                    </span>
                  </div>

                  {/* Assigned Equipment List */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 block font-semibold mb-1">
                      Assigned Gear ({assignedEquip.length}):
                    </span>
                    {assignedEquip.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No gear assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {assignedEquip.map((eq) => (
                          <span
                            key={eq.id}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded"
                          >
                            {eq.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TASKS DELEGATION */}
      {activeTab === 'TASKS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Expedition Task Management</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Delegate field tasks and track completion status.
              </p>
            </div>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {tasksList.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No tasks created yet for this expedition.</div>
            ) : (
              tasksList.map((task) => (
                <div key={task.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>{task.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          task.priority === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : task.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs">{task.description}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CARGO */}
      {activeTab === 'CARGO' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Expedition Cargo Shipments</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {cargoList.map((cargo) => (
              <div key={cargo.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{cargo.description}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Tracking: {cargo.trackingCode || cargo.id}</div>
                </div>
                <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800">
                  {cargo.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN EQUIPMENT */}
      {isAssignModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Assign Expedition Equipment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Allocate <span className="font-bold text-slate-800">{selectedAsset.name}</span> to a team member.
            </p>

            <form onSubmit={handleConfirmAssignment} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Equipment Name:</span>
                  <span className="font-bold text-slate-800">{selectedAsset.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Serial Number:</span>
                  <span className="font-mono text-slate-600">{selectedAsset.serialNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Battery Level:</span>
                  <span className="font-bold text-emerald-600">{selectedAsset.batteryPercentage ?? 92}%</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Team Member</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800"
                >
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {isSubmittingAssign ? 'Assigning...' : 'Assign Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TASK */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Expedition Task</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new operational task to be tracked and assigned to field crew.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seismic sensor calibration, Fuel transfer check"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Details and precautions..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assignee</label>
                  <select
                    value={taskForm.assignedToId}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold shadow-xs transition"
                >
                  Create & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Building2,
  Users,
  Truck,
  FolderOpen,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  FileText,
  Activity,
  UserCheck,
  Wrench,
  Compass,
} from 'lucide-react';
import { OrganizationOverview } from '../types';
import { fetchOrganizationOverview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useExpedition } from '../context/ExpeditionContext';

interface OrganizationAdminPageProps {
  onNavigate?: (path: string) => void;
  onSelectExpedition?: (expeditionId: string) => void;
}

export const OrganizationAdminPage: React.FC<OrganizationAdminPageProps> = ({
  onNavigate = () => {},
  onSelectExpedition,
}) => {
  const { currentUser, currentRole } = useAuth();
  const { currentExpedition, switchExpedition } = useExpedition();

  const [overview, setOverview] = useState<OrganizationOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab filtering
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PERSONNEL' | 'ASSETS' | 'EXPEDITIONS' | 'AUDIT'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [personnelFilter, setPersonnelFilter] = useState<'ALL' | 'AVAILABLE' | 'DEPLOYED' | 'OVERDUE'>('ALL');
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'FAILED'>('ALL');

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch for default PRO-GLOBAL or current expedition's org
      const orgId = currentUser?.organizationId || 'default-org-id';
      const data = await fetchOrganizationOverview(orgId);
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load organization overview:', err);
      setError(err.message || 'Unable to retrieve organization management data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <Globe className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading Organization Fleet & Resource Portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto my-12 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold text-rose-900">Organization Data Unavailable</h3>
        <p className="text-xs text-rose-700">{error || 'Could not load organization records.'}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  const { organization, personnelPool, assetPool, expeditionsSummary } = overview;
  const auditLogs = overview.auditLogs || overview.recentAuditLogs || [];
  const personnelList = personnelPool.personnel || personnelPool.members || [];

  // Filtered personnel
  const filteredPersonnel = (personnelList || []).filter((p: any) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.qualification.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (personnelFilter === 'AVAILABLE') return p.expedition?.lifecycleStatus !== 'ACTIVE';
    if (personnelFilter === 'DEPLOYED') return p.expedition?.lifecycleStatus === 'ACTIVE';
    if (personnelFilter === 'OVERDUE') return p.isCheckInOverdue;
    return true;
  });

  // Filtered assets
  const filteredAssets = (assetPool.assets || []).filter((a: any) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (assetFilter === 'AVAILABLE') return a.lifecycleStatus === 'AVAILABLE';
    if (assetFilter === 'IN_USE') return a.lifecycleStatus === 'IN_USE' || a.lifecycleStatus === 'ASSIGNED';
    if (assetFilter === 'MAINTENANCE') return a.lifecycleStatus === 'MAINTENANCE_DUE' || a.lifecycleStatus === 'UNDER_MAINTENANCE';
    if (assetFilter === 'FAILED') return a.lifecycleStatus === 'FAILED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Organization Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-sky-600 text-white rounded-xl shadow-xs">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{organization.name}</h1>
                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-xs font-mono font-bold">
                  {organization.code}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                  Enterprise Org Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{organization.description}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('/expeditions/new')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Compass className="w-4 h-4" />
              <span>Commission New Expedition</span>
            </button>
          </div>
        </div>

        {/* Global Resource Metric Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Expeditions</div>
            <div className="text-lg font-black text-slate-900">{expeditionsSummary.length}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">
              {expeditionsSummary.filter((e) => e.lifecycleStatus === 'ACTIVE').length} Active
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Personnel Pool</div>
            <div className="text-lg font-black text-slate-900">{personnelPool.total}</div>
            <div className="text-[10px] text-sky-600 font-semibold">
              {personnelPool.available} Available
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Overdue Check-Ins</div>
            <div className={`text-lg font-black ${personnelPool.overdueCheckIns > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {personnelPool.overdueCheckIns}
            </div>
            <div className="text-[10px] text-slate-500">Accountability</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Fleet Assets</div>
            <div className="text-lg font-black text-slate-900">{assetPool.total}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">
              {assetPool.available} Available
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Maintenance Due</div>
            <div className={`text-lg font-black ${assetPool.maintenanceDue > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {assetPool.maintenanceDue}
            </div>
            <div className="text-[10px] text-slate-500">Fleet Service</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="text-[10px] uppercase font-bold text-slate-400">Failed / Damaged</div>
            <div className={`text-lg font-black ${assetPool.failed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {assetPool.failed}
            </div>
            <div className="text-[10px] text-slate-500">Out of Commission</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-b border-slate-200 pt-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 border-b-2 transition ${
              activeTab === 'OVERVIEW'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Questions
          </button>
          <button
            onClick={() => setActiveTab('PERSONNEL')}
            className={`px-4 py-2 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'PERSONNEL'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Personnel Pool ({personnelPool.total})</span>
          </button>
          <button
            onClick={() => setActiveTab('ASSETS')}
            className={`px-4 py-2 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'ASSETS'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Asset Pool ({assetPool.total})</span>
          </button>
          <button
            onClick={() => setActiveTab('EXPEDITIONS')}
            className={`px-4 py-2 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'EXPEDITIONS'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Expeditions Portfolio ({expeditionsSummary.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-2 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'AUDIT'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ANSWERS */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Who is Available? */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Who is available?</span>
              </h2>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {personnelPool.available} / {personnelPool.total} Available
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Personnel not currently deployed to an ACTIVE mission are available for assignment to upcoming expeditions.
            </p>
            <div className="space-y-2">
              {(personnelList || [])
                .filter((p: any) => p.expedition?.lifecycleStatus !== 'ACTIVE')
                .slice(0, 4)
                .map((p: any) => (
                  <div key={p.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.role} • {p.qualification}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      READY
                    </span>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setActiveTab('PERSONNEL')}
              className="text-xs text-sky-600 font-bold hover:underline flex items-center space-x-1"
            >
              <span>View full personnel availability matrix</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Card: Which assets are available? */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Which assets are available?</span>
              </h2>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                {assetPool.available} / {assetPool.total} Available
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vehicles, vessels, and generators currently standing by at base stations without active mission commitment.
            </p>
            <div className="space-y-2">
              {(assetPool.assets || [])
                .filter((a: any) => a.lifecycleStatus === 'AVAILABLE')
                .slice(0, 4)
                .map((a: any) => (
                  <div key={a.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{a.name} ({a.assetCode})</div>
                      <div className="text-[11px] text-slate-500">{a.type} • {a.station?.name || 'Base Staging'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px]">
                      AVAILABLE
                    </span>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setActiveTab('ASSETS')}
              className="text-xs text-sky-600 font-bold hover:underline flex items-center space-x-1"
            >
              <span>View full fleet asset allocation</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Card: Which expeditions are active / not ready? */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs md:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-sky-600" />
                <span>Expeditions Lifecycle & Operational Readiness</span>
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {expeditionsSummary.length} Total Commissioned
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {expeditionsSummary.map((e) => (
                <div key={e.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      {e.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        e.lifecycleStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : e.lifecycleStatus === 'COMPLETED'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {e.lifecycleStatus}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 line-clamp-1">{e.title}</h3>
                  <div className="text-[11px] text-slate-600">
                    Commander: <strong>{e.commanderName}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between pt-2 border-t border-slate-200/50">
                    <span>Crew: {e.crewCount}</span>
                    <span>Stations: {e.stationCount}</span>
                    <span>Risk: {e.overallRiskScore}</span>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        switchExpedition(e.id);
                        onNavigate('/dashboard');
                      }}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition shadow-2xs"
                    >
                      Open Operations
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONNEL POOL */}
      {activeTab === 'PERSONNEL' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-4 h-4 text-sky-600" />
                <span>Personnel Roster & Availability Pool</span>
              </h2>
              <p className="text-xs text-slate-500">
                Track expedition commitments, certifications, and real-time accountability check-ins
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {(['ALL', 'AVAILABLE', 'DEPLOYED', 'OVERDUE'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPersonnelFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    personnelFilter === f ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Name & Member ID</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Qualifications</th>
                  <th className="py-2.5 px-3">Committed Expedition</th>
                  <th className="py-2.5 px-3">Check-in Status</th>
                  <th className="py-2.5 px-3">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPersonnel.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.memberId}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{p.role}</td>
                    <td className="py-3 px-3 text-slate-600">{p.qualification}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {p.expedition?.code || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.isCheckInOverdue
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.isCheckInOverdue ? 'OVERDUE' : p.checkInStatus || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.expedition?.lifecycleStatus === 'ACTIVE'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.expedition?.lifecycleStatus === 'ACTIVE' ? 'DEPLOYED' : 'AVAILABLE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ASSET POOL */}
      {activeTab === 'ASSETS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Fleet Asset Allocation & Maintenance Pool</span>
              </h2>
              <p className="text-xs text-slate-500">
                Track machinery operational health, station staging, and overhaul schedules
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {(['ALL', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'FAILED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setAssetFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    assetFilter === f ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Asset Code & Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Station Staging</th>
                  <th className="py-2.5 px-3">Assigned Expedition</th>
                  <th className="py-2.5 px-3">Operating Hours</th>
                  <th className="py-2.5 px-3">Lifecycle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{a.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{a.assetCode}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{a.type}</td>
                    <td className="py-3 px-3 text-slate-600">{a.station?.name || 'Base Staging'}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {a.expedition?.code || 'Standby'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {a.operatingHours} / {a.maintenanceInterval} hrs
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.lifecycleStatus === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : a.lifecycleStatus === 'MAINTENANCE_DUE'
                            ? 'bg-amber-100 text-amber-800'
                            : a.lifecycleStatus === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {a.lifecycleStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXPEDITIONS PORTFOLIO */}
      {activeTab === 'EXPEDITIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <FolderOpen className="w-4 h-4 text-sky-600" />
              <span>Full Expeditions Portfolio</span>
            </h2>
            <button
              onClick={() => onNavigate('/expeditions/new')}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              + Create Expedition
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expeditionsSummary.map((e) => (
              <div key={e.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                    {e.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      e.lifecycleStatus === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {e.lifecycleStatus}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900">{e.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Commander: <strong className="text-slate-700">{e.commanderName}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center text-xs">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Crew</div>
                    <div className="font-black text-slate-800">{e.crewCount}</div>
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Assets</div>
                    <div className="font-black text-slate-800">{e.assetCount}</div>
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Risk</div>
                    <div className="font-black text-rose-700">{e.overallRiskScore}</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      switchExpedition(e.id);
                      onNavigate('/dashboard');
                    }}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs text-center"
                  >
                    Switch to Expedition
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Enterprise Audit Activity Trail</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Immutable Ledger</span>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-slate-700 font-medium">
                  {log.reason || `Mutated ${log.entity} (${log.entityId})`}
                </div>
                <div className="text-[10px] text-slate-400">
                  By {log.userName || 'System'} ({log.userRole || 'ADMIN'})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

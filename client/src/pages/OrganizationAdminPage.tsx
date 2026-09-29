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
  Bell,
  Sliders,
  Radio,
  Key,
  Save,
  Check,
  Shield,
  User,
  Wifi,
  Satellite,
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
  const { currentUser, currentRole, canRaiseRequirements, canEditOperationalData, canExecuteActions } = useAuth();
  const { currentExpedition, switchExpedition } = useExpedition();

  const [overview, setOverview] = useState<OrganizationOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings active tab
  const [settingsTab, setSettingsTab] = useState<'PROFILE' | 'NOTIFICATIONS' | 'SYSTEM' | 'SECURITY' | 'PORTFOLIO'>('PROFILE');

  // Subtab for portfolio
  const [portfolioSubTab, setPortfolioSubTab] = useState<'OVERVIEW' | 'PERSONNEL' | 'ASSETS' | 'EXPEDITIONS' | 'AUDIT'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [personnelFilter, setPersonnelFilter] = useState<'ALL' | 'AVAILABLE' | 'DEPLOYED' | 'OVERDUE'>('ALL');
  const [assetFilter, setAssetFilter] = useState<'ALL' | 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'FAILED'>('ALL');

  // Interactive settings state
  const [coordFormat, setCoordFormat] = useState<'DD' | 'DMS' | 'MGRS'>('DD');
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [refreshInterval, setRefreshInterval] = useState<number>(15);
  const [lowBandwidthMode, setLowBandwidthMode] = useState<boolean>(false);
  const [notifyMedical, setNotifyMedical] = useState<boolean>(true);
  const [notifyWeather, setNotifyWeather] = useState<boolean>(true);
  const [notifyStockout, setNotifyStockout] = useState<boolean>(true);
  const [notifyDelay, setNotifyDelay] = useState<boolean>(true);
  const [audioChimes, setAudioChimes] = useState<boolean>(false);
  const [sessionTimeout, setSessionTimeout] = useState<number>(30);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSavePreferences = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
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
          <p className="text-xs font-medium text-slate-500">Loading PolarCommand System Settings & Organization Portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto my-12 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-sm font-semibold text-rose-900">Organization Data Unavailable</h3>
        <p className="text-xs text-rose-700">{error || 'Could not load organization records.'}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
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
      (p.qualification && p.qualification.toLowerCase().includes(searchQuery.toLowerCase()));
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
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              System Settings & Operational Controls
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-medium border border-sky-200">
              {currentRole.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage operator profile, RBAC permissions, telemetry refresh preferences, satellite communications, and organization ledger.
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center space-x-1 border-b border-slate-200 text-xs">
        <button
          onClick={() => setSettingsTab('PROFILE')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
            settingsTab === 'PROFILE'
              ? 'border-sky-600 text-sky-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile & Role Access</span>
        </button>

        <button
          onClick={() => setSettingsTab('NOTIFICATIONS')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
            settingsTab === 'NOTIFICATIONS'
              ? 'border-sky-600 text-sky-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setSettingsTab('SYSTEM')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
            settingsTab === 'SYSTEM'
              ? 'border-sky-600 text-sky-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>System & Comms</span>
        </button>

        <button
          onClick={() => setSettingsTab('SECURITY')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
            settingsTab === 'SECURITY'
              ? 'border-sky-600 text-sky-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Terminals</span>
        </button>

        <button
          onClick={() => setSettingsTab('PORTFOLIO')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
            settingsTab === 'PORTFOLIO'
              ? 'border-sky-600 text-sky-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Organization & Fleet Portfolio</span>
        </button>
      </div>

      {/* TAB 1: PROFILE & ROLE ACCESS */}
      {settingsTab === 'PROFILE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Operator Profile Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-11 h-11 rounded-full bg-sky-100 text-sky-700 font-semibold flex items-center justify-center text-sm">
                {currentUser?.name ? currentUser.name.split(' ').map((n) => n[0]).join('').substring(0, 2) : 'OP'}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{currentUser?.name || 'Active Polar Operator'}</h2>
                <div className="text-[11px] text-slate-500">{currentUser?.email || 'operator@polarcommand.org'}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-slate-400 font-medium block">Current Assigned Role</span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-medium">
                  {currentRole.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Assigned Station / Mission Context</span>
                <span className="font-medium text-slate-800 text-xs">
                  {currentUser?.stationId ? `${currentUser.stationId.toUpperCase()} Station` : currentExpedition?.title || 'Global Command Center'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Parent Organization</span>
                <span className="font-medium text-slate-800 text-xs">
                  {organization.name} (National Centre for Polar & Ocean Research)
                </span>
              </div>
            </div>
          </div>

          {/* RBAC Access & Permissions Matrix */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <div className="pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-sky-600" />
                <span>Role-Based Operational Permissions (RBAC)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Permissions granted to your session according to PolarCommand security architecture.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">Operational Supply Requirements</div>
                  <div className="text-[11px] text-slate-500">Raise or approve station & traverse supply requests</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  canRaiseRequirements || currentRole === 'ADMIN'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {canRaiseRequirements ? 'CAN CREATE' : currentRole === 'ADMIN' ? 'CAN APPROVE' : 'VIEW ONLY'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">Station & Personnel Operations</div>
                  <div className="text-[11px] text-slate-500">Edit duty status, shift assignments, and station telemetries</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  canEditOperationalData
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {canEditOperationalData ? 'PERMITTED' : 'RESTRICTED'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">Emergency Actions & Mitigations</div>
                  <div className="text-[11px] text-slate-500">Dispatch resource reallocations and resolve risk alerts</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  canExecuteActions
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {canExecuteActions ? 'AUTHORIZED' : 'RESTRICTED'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">Equipment Fleet Service</div>
                  <div className="text-[11px] text-slate-500">Record maintenance overhauls and reset operating windows</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  canEditOperationalData
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {canEditOperationalData ? 'PERMITTED' : 'RESTRICTED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NOTIFICATIONS */}
      {settingsTab === 'NOTIFICATIONS' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs max-w-2xl text-xs">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Operational Alert Subscriptions</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configure which mission events trigger immediate in-app and satellite terminal alerts.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={notifyMedical}
                onChange={(e) => setNotifyMedical(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-slate-900">Personnel Medical & Distress Beacons</div>
                <div className="text-[11px] text-slate-500">Trigger immediate high-priority alerts when wearable telemetry indicates hypothermia or distress.</div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={notifyStockout}
                onChange={(e) => setNotifyStockout(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-slate-900">Critical Supply Stockout & Threshold Alarms</div>
                <div className="text-[11px] text-slate-500">Alert when station diesel reserves or emergency ration buffers drop below 14-day autonomy.</div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={notifyWeather}
                onChange={(e) => setNotifyWeather(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-slate-900">Severe Antarctic Storm & Blizzard Advisories</div>
                <div className="text-[11px] text-slate-500">Surface wind forecasts exceeding 45 knots or visibility dropping below 100 meters.</div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={notifyDelay}
                onChange={(e) => setNotifyDelay(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-slate-900">Traverse Convoy Check-In Overdue</div>
                <div className="text-[11px] text-slate-500">Alert when a remote vehicle convoy misses its scheduled 6-hour HF radio check-in window.</div>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={audioChimes}
                onChange={(e) => setAudioChimes(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-slate-900">Audio Warning Chime on Critical Dispatch</div>
                <div className="text-[11px] text-slate-500">Play an audible chime when high-severity operational emergency actions are broadcast.</div>
              </div>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Notification Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM & COMMS PREFERENCES */}
      {settingsTab === 'SYSTEM' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs max-w-2xl text-xs">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">System & Comms Preferences</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Telemetry units, map coordinate projections, and data synchronization cadence.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Geographic Coordinate Format</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'DD', label: 'Decimal Degrees (DD)', ex: '-70.765°, 11.734°' },
                  { id: 'DMS', label: 'Degrees-Min-Sec (DMS)', ex: "70°45'54\"S, 11°44'02\"E" },
                  { id: 'MGRS', label: 'Military Grid (MGRS)', ex: 'Zone 32V EK 4589 1234' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCoordFormat(item.id as any)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      coordFormat === item.id
                        ? 'border-sky-600 bg-sky-50/70 text-sky-900 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 font-medium hover:bg-slate-100'
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.ex}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Temperature Scale Unit</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setTempUnit('C')}
                  className={`px-4 py-2 rounded-lg border text-xs font-semibold transition ${
                    tempUnit === 'C' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Celsius (°C) — Polar Standard
                </button>
                <button
                  type="button"
                  onClick={() => setTempUnit('F')}
                  className={`px-4 py-2 rounded-lg border text-xs font-semibold transition ${
                    tempUnit === 'F' ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Fahrenheit (°F)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Telemetry Stream Refresh Interval</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sec: 5, label: '5 Seconds', note: 'Real-time broadband' },
                  { sec: 15, label: '15 Seconds', note: 'Standard recommended' },
                  { sec: 60, label: '60 Seconds', note: 'Low-bandwidth satellite' },
                ].map((r) => (
                  <button
                    key={r.sec}
                    type="button"
                    onClick={() => setRefreshInterval(r.sec)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      refreshInterval === r.sec
                        ? 'border-sky-600 bg-sky-50/70 text-sky-900 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 font-medium hover:bg-slate-100'
                    }`}
                  >
                    <div>{r.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{r.note}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={lowBandwidthMode}
                onChange={(e) => setLowBandwidthMode(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <div className="font-semibold text-slate-900">Low-Bandwidth Polar Satellite Link Compression</div>
                <div className="text-[11px] text-slate-500">Compresses JSON payloads and suspends automatic tile fetching when connecting over Iridium SBD.</div>
              </div>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save System Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & TERMINALS */}
      {settingsTab === 'SECURITY' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs max-w-2xl text-xs">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Security & Terminal Uplink</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cryptographic status, satellite uplink transceivers, and emergency distress beacon configuration.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Satellite Uplink Encryption</span>
                <span className="text-[11px] text-slate-500">AES-256 GCM end-to-end encrypted link with NCPOR Goa Server</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Iridium SBD Transceiver Gateway</span>
                <span className="text-[11px] text-slate-500">Station rooftop antenna uplink (Modem ID: IRID-9602-04)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                CONNECTED
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">COSPAS-SARSAT Emergency Beacon Link</span>
                <span className="text-[11px] text-slate-500">Dedicated distress transmitter channel: 406.037 MHz</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold text-[10px] border border-sky-200">
                STANDBY
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Session Inactivity Lockout</label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                <option value={15}>15 Minutes of Inactivity</option>
                <option value={30}>30 Minutes of Inactivity (Recommended)</option>
                <option value={60}>60 Minutes of Inactivity</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Security Parameters</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: ORGANIZATION & FLEET PORTFOLIO */}
      {settingsTab === 'PORTFOLIO' && (
        <div className="space-y-4">
          {/* Organization Summary Banner */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-sky-600 text-white rounded-lg shadow-xs">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900">{organization.name}</h2>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                      NCPOR Polar Command
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{organization.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('/expeditions/new')}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Commission New Expedition</span>
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-[10px] font-medium text-slate-500">Total Expeditions</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{expeditionsSummary.length}</div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  {expeditionsSummary.filter((e) => e.lifecycleStatus === 'ACTIVE').length} Active
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-[10px] font-medium text-slate-500">Personnel Pool</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{personnelPool.total}</div>
                <div className="text-[10px] text-sky-600 font-medium">
                  {personnelPool.available} Available
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-[10px] font-medium text-slate-500">Overdue Check-Ins</div>
                <div className={`text-lg font-bold mt-0.5 ${personnelPool.overdueCheckIns > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {personnelPool.overdueCheckIns}
                </div>
                <div className="text-[10px] text-slate-400">Accountability</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-[10px] font-medium text-slate-500">Total Fleet Assets</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{assetPool.total}</div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  {assetPool.available} Available
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-[10px] font-medium text-slate-500">Maintenance Due</div>
                <div className={`text-lg font-bold mt-0.5 ${assetPool.maintenanceDue > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {assetPool.maintenanceDue}
                </div>
                <div className="text-[10px] text-slate-400">Fleet Service</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="text-[10px] font-medium text-slate-500">Failed / Damaged</div>
                <div className={`text-lg font-bold mt-0.5 ${assetPool.failed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {assetPool.failed}
                </div>
                <div className="text-[10px] text-slate-400">Out of Commission</div>
              </div>
            </div>

            {/* Subtabs for Portfolio */}
            <div className="flex items-center space-x-1 border-b border-slate-200 pt-2 text-xs">
              <button
                onClick={() => setPortfolioSubTab('OVERVIEW')}
                className={`px-3 py-1.5 border-b-2 transition ${
                  portfolioSubTab === 'OVERVIEW'
                    ? 'border-sky-600 text-sky-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                Overview & Summary
              </button>
              <button
                onClick={() => setPortfolioSubTab('PERSONNEL')}
                className={`px-3 py-1.5 border-b-2 transition flex items-center space-x-1 ${
                  portfolioSubTab === 'PERSONNEL'
                    ? 'border-sky-600 text-sky-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Personnel Pool ({personnelPool.total})</span>
              </button>
              <button
                onClick={() => setPortfolioSubTab('ASSETS')}
                className={`px-3 py-1.5 border-b-2 transition flex items-center space-x-1 ${
                  portfolioSubTab === 'ASSETS'
                    ? 'border-sky-600 text-sky-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Truck className="w-3 h-3" />
                <span>Asset Pool ({assetPool.total})</span>
              </button>
              <button
                onClick={() => setPortfolioSubTab('EXPEDITIONS')}
                className={`px-3 py-1.5 border-b-2 transition flex items-center space-x-1 ${
                  portfolioSubTab === 'EXPEDITIONS'
                    ? 'border-sky-600 text-sky-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <FolderOpen className="w-3 h-3" />
                <span>Expeditions Portfolio ({expeditionsSummary.length})</span>
              </button>
              <button
                onClick={() => setPortfolioSubTab('AUDIT')}
                className={`px-3 py-1.5 border-b-2 transition flex items-center space-x-1 ${
                  portfolioSubTab === 'AUDIT'
                    ? 'border-sky-600 text-sky-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>Audit Trail</span>
              </button>
            </div>
          </div>

          {/* Subtab Contents */}
          {portfolioSubTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-semibold text-slate-900 flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Who is available?</span>
                  </h3>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {personnelPool.available} / {personnelPool.total} Available
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Personnel not currently deployed to an ACTIVE mission are available for assignment to upcoming expeditions.
                </p>
                <div className="space-y-2">
                  {(personnelList || [])
                    .filter((p: any) => p.expedition?.lifecycleStatus !== 'ACTIVE')
                    .slice(0, 4)
                    .map((p: any) => (
                      <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500">{p.role} • {p.qualification}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                          READY
                        </span>
                      </div>
                    ))}
                </div>
                <button
                  onClick={() => setPortfolioSubTab('PERSONNEL')}
                  className="text-xs text-sky-600 font-medium hover:underline flex items-center space-x-1 pt-1"
                >
                  <span>View full personnel availability matrix</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-semibold text-slate-900 flex items-center space-x-1.5">
                    <Truck className="w-4 h-4 text-sky-600" />
                    <span>Which assets are available?</span>
                  </h3>
                  <span className="text-xs font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {assetPool.available} / {assetPool.total} Available
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Vehicles, vessels, and generators currently standing by at base stations without active mission commitment.
                </p>
                <div className="space-y-2">
                  {(assetPool.assets || [])
                    .filter((a: any) => a.lifecycleStatus === 'AVAILABLE')
                    .slice(0, 4)
                    .map((a: any) => (
                      <div key={a.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{a.name} ({a.assetCode})</div>
                          <div className="text-[11px] text-slate-500">{a.type} • {a.station?.name || 'Base Staging'}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-medium text-[10px]">
                          AVAILABLE
                        </span>
                      </div>
                    ))}
                </div>
                <button
                  onClick={() => setPortfolioSubTab('ASSETS')}
                  className="text-xs text-sky-600 font-medium hover:underline flex items-center space-x-1 pt-1"
                >
                  <span>View full fleet asset allocation</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {portfolioSubTab === 'PERSONNEL' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Personnel Roster & Availability Pool</h3>
                  <p className="text-[11px] text-slate-500">Track expedition commitments, certifications, and real-time check-ins</p>
                </div>
                <div className="flex items-center space-x-1.5">
                  {(['ALL', 'AVAILABLE', 'DEPLOYED', 'OVERDUE'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setPersonnelFilter(f)}
                      className={`px-2.5 py-1 rounded text-xs transition ${
                        personnelFilter === f ? 'bg-sky-600 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Name</th>
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
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.specialization || p.qualification || 'Member'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{p.role}</td>
                        <td className="py-3 px-3 text-slate-600">{p.qualification}</td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-xs text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {p.expedition?.title || p.expedition?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            p.isCheckInOverdue ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.isCheckInOverdue ? 'OVERDUE' : p.checkInStatus || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            p.expedition?.lifecycleStatus === 'ACTIVE' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
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

          {portfolioSubTab === 'ASSETS' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Fleet Asset Allocation & Maintenance Pool</h3>
                  <p className="text-[11px] text-slate-500">Track machinery operational health and overhaul schedules</p>
                </div>
                <div className="flex items-center space-x-1.5">
                  {(['ALL', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'FAILED'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAssetFilter(f)}
                      className={`px-2.5 py-1 rounded text-xs transition ${
                        assetFilter === f ? 'bg-sky-600 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
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
                          <div className="font-semibold text-slate-900">{a.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{a.assetCode}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{a.type}</td>
                        <td className="py-3 px-3 text-slate-600">{a.station?.name || 'Base Staging'}</td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {a.expedition?.code || 'Standby'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {a.operatingHours} / {a.maintenanceInterval} hrs
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            a.lifecycleStatus === 'FAILED'
                              ? 'bg-rose-100 text-rose-800'
                              : a.lifecycleStatus === 'MAINTENANCE_DUE'
                              ? 'bg-amber-100 text-amber-800'
                              : a.lifecycleStatus === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
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

          {portfolioSubTab === 'EXPEDITIONS' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Expeditions Portfolio</h3>
                  <p className="text-[11px] text-slate-500">Commissioned polar missions and commander accountability</p>
                </div>
                <button
                  onClick={() => onNavigate('/expeditions/new')}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  + Create Expedition
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expeditionsSummary.map((e) => (
                  <div key={e.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
                        Polar Expedition
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        e.lifecycleStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {e.lifecycleStatus}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{e.title}</h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Commander: <strong className="text-slate-700 font-medium">{e.commanderName}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center text-xs">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-medium uppercase">Crew</div>
                        <div className="font-bold text-slate-800">{e.crewCount}</div>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-medium uppercase">Assets</div>
                        <div className="font-bold text-slate-800">{e.assetCount}</div>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-medium uppercase">Risk</div>
                        <div className="font-bold text-rose-700">{e.overallRiskScore}</div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          switchExpedition(e.id);
                          onNavigate('/dashboard');
                        }}
                        className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition shadow-xs text-center"
                      >
                        Switch to Expedition
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {portfolioSubTab === 'AUDIT' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-2xs text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center space-x-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Enterprise Audit Activity Trail</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Immutable record of mission parameter mutations</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">Ledger Verified</span>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
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
      )}
    </div>
  );
};

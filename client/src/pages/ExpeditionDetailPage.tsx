import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Shield,
  Layers,
  Users,
  Package,
  Wrench,
  AlertTriangle,
  Compass,
  Radio,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Expedition } from '../types';
import { getExpeditionDetails } from '../services/expeditionService';
import { useExpedition } from '../context/ExpeditionContext';
import { ExpeditionRoute } from '../components/expedition/ExpeditionRoute';
import { ExpeditionTracking } from '../components/expedition/ExpeditionTracking';
import { ExpeditionTeam } from '../components/expedition/ExpeditionTeam';
import { ExpeditionLogistics } from '../components/expedition/ExpeditionLogistics';

interface ExpeditionDetailPageProps {
  expeditionId: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export const ExpeditionDetailPage: React.FC<ExpeditionDetailPageProps> = ({
  expeditionId,
  onNavigate,
  onBack,
}) => {
  const { switchExpedition } = useExpedition();
  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'route' | 'team' | 'logistics' | 'alerts'>('overview');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getExpeditionDetails(expeditionId);
        if (isMounted) {
          setExpedition(data);
          // Sync active context with opened expedition
          switchExpedition(data.id);
        }
      } catch (err: any) {
        console.error('Failed to load expedition details:', err);
        if (isMounted) {
          setError(err.message || 'Expedition not found');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (expeditionId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [expeditionId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center space-y-4 font-sans">
        <div className="w-10 h-10 border-3 border-sky-200 border-t-[#0284C7] rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading expedition operational records...</p>
      </div>
    );
  }

  if (error || !expedition) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Expedition Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'The requested polar expedition could not be loaded.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#0284C7] text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition cursor-pointer"
        >
          ← Back to Expedition Hub
        </button>
      </div>
    );
  }

  const isExpActive =
    expedition.status?.toUpperCase() === 'ACTIVE' || expedition.lifecycleStatus === 'ACTIVE';
  const isExpPlanning =
    expedition.status?.toUpperCase() === 'PLANNING' ||
    expedition.lifecycleStatus === 'PLANNED' ||
    expedition.lifecycleStatus === 'DRAFT';

  // Format date range
  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const sFmt = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const eFmt = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${sFmt} – ${eFmt}`;
    } catch {
      return '2026 – 2027';
    }
  };

  const dateRange = formatDateRange(expedition.startDate, expedition.endDate);
  const routeSummary = `${(expedition.origin || 'Staging Base').split('/')[0].split(',')[0].trim()} → ${(expedition.destination || 'Polar Field').split('&')[0].split(',')[0].trim()}`;
  const alertsList = expedition.alerts || [];

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto font-sans select-none">
      {/* 1. Navigation Back Button & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4 text-[#0284C7]" />
          <span>Back to Expedition Hub</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/live-map')}
            className="px-3.5 py-1.5 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Live Map Track</span>
          </button>
          <button
            onClick={() => onNavigate('/mission-planning')}
            className="px-3.5 py-1.5 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Mission Plan</span>
          </button>
          <button
            onClick={() => onNavigate('/logistics')}
            className="px-3.5 py-1.5 bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Logistics Hub</span>
          </button>
        </div>
      </div>

      {/* 2. Expedition Header Banner (Light Arctic Pure Vector, NO PHOTOS) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
        {/* Subtle Pure Vector Mountain Graphic (NO PHOTOGRAPHS) */}
        <div className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-none opacity-40 overflow-hidden flex items-end justify-end">
          <svg viewBox="0 0 700 180" className="w-full h-full text-sky-400" fill="none">
            <defs>
              <linearGradient id="detailMtn1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="detailMtn2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#F0F9FF" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M0,180 L90,110 L180,150 L270,75 L360,130 L460,60 L560,120 L650,45 L700,90 L700,180 Z"
              fill="url(#detailMtn1)"
            />
            <path
              d="M30,180 L120,125 L210,160 L320,95 L410,145 L500,80 L600,140 L700,75 L700,180 Z"
              fill="url(#detailMtn2)"
            />
          </svg>
        </div>

        <div className="relative z-10 space-y-3">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isExpActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isExpPlanning
                  ? 'bg-sky-50 text-[#0284C7] border border-sky-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isExpActive ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'
                }`}
              />
              <span>{isExpActive ? 'Active Mission' : isExpPlanning ? 'Planning Phase' : 'Completed'}</span>
            </span>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
              {expedition.code}
            </span>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {expedition.type}
            </span>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              ● Operational Status: Nominal (Risk {expedition.overallRiskScore || 24}%)
            </span>
          </div>

          {/* Mission Title (Clean 700 bold) */}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {expedition.title}
          </h1>

          {/* Subtitle / Key Facts Row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 pt-1">
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
              <span className="font-semibold text-slate-800">{routeSummary}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{dateRange}</span>
            </div>
            {expedition.commanderName && (
              <div className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Leader: <strong className="text-slate-800">{expedition.commanderName}</strong></span>
              </div>
            )}
            <div className="flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-700 font-medium">Comms: {expedition.connectivityStatus || 'ONLINE'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200/90 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'overview'
              ? 'bg-white text-[#0284C7] border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Overview & Live Tracking</span>
        </button>

        <button
          onClick={() => setActiveTab('route')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'route'
              ? 'bg-white text-[#0284C7] border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Route Waypoints ({expedition.route?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'team'
              ? 'bg-white text-[#0284C7] border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Team Roster ({expedition.personnel?.length || expedition._count?.personnel || 4})</span>
        </button>

        <button
          onClick={() => setActiveTab('logistics')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'logistics'
              ? 'bg-white text-[#0284C7] border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Logistics & Equipment</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
            activeTab === 'alerts'
              ? 'bg-white text-[#0284C7] border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Operational Alerts ({alertsList.length})</span>
        </button>
      </div>

      {/* 4. Tab Content Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Operational Status & Route Progress Strip (Compact & Operational) */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current Phase</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{expedition.currentRouteStep || 'Coastal Transit'}</div>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current Position</div>
                <div className="text-sm font-semibold text-slate-700 font-mono mt-0.5">
                  {expedition.currentLocation?.name
                    ? `${expedition.currentLocation.name} (${expedition.currentLocation.latitude.toFixed(2)}°S, ${expedition.currentLocation.longitude.toFixed(2)}°E)`
                    : 'Traverse Corridor (69.41°S, 76.18°E)'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:min-w-[260px]">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Route Progress</span>
                  <span className="text-xs font-bold text-[#0284C7]">45%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0284C7] rounded-full transition-all duration-500" style={{ width: '45%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Live Telemetry & Interactive Map */}
          <div>
            <ExpeditionTracking expedition={expedition} />
          </div>
        </div>
      )}

      {activeTab === 'route' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Full Expedition Route Progression</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured multi-stage itinerary from logistics embarkation to target scientific field site and recovery.
            </p>
          </div>
          <ExpeditionRoute steps={expedition.route || []} compact={false} />
        </div>
      )}

      {activeTab === 'team' && (
        <ExpeditionTeam personnel={expedition.personnel} commanderName={expedition.commanderName} />
      )}

      {activeTab === 'logistics' && (
        <ExpeditionLogistics
          cargo={expedition.cargoShipments || expedition.cargo}
          assets={expedition.keyAssets || expedition.assets}
          stations={expedition.assignedStations || expedition.stations}
          onNavigate={onNavigate}
        />
      )}

      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Expedition-Specific Operational Alerts ({alertsList.length})
            </h4>
            <span className="text-xs font-semibold text-slate-500">
              Comms Link: <strong className="text-emerald-600">{expedition.connectivityStatus || 'ONLINE'}</strong>
            </span>
          </div>

          {alertsList.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No Active Critical Warnings</p>
              <p className="text-xs text-slate-400 mt-0.5">All field units and logistics links operating within nominal parameters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertsList.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">{alert.title}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-800">
                      {alert.severity}
                    </span>
                  </div>

                  {alert.reason && (
                    <div className="text-xs text-slate-600">
                      <strong>Reason:</strong> {alert.reason}
                    </div>
                  )}

                  {alert.impact && (
                    <div className="text-xs text-slate-600">
                      <strong>Impact:</strong> {alert.impact}
                    </div>
                  )}

                  {alert.recommendedAction && (
                    <div className="p-2.5 bg-white/80 rounded-lg text-xs text-slate-700 font-medium border border-amber-100">
                      <strong className="text-amber-800">Action:</strong> {alert.recommendedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

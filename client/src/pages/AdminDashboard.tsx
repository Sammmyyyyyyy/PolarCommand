import React, { useState, useEffect, useMemo } from 'react';
import {
  Mountain,
  Users,
  Package,
  Truck,
  Building2,
  Compass,
  AlertTriangle,
  Wrench,
  Info,
  Maximize2,
  Plus,
  Minus,
  ExternalLink,
  ChevronRight,
  Clock,
  Calendar,
  X,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { fetchAdminSummary } from '../services/api';
import { AdminGlobalSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { useExpedition } from '../context/ExpeditionContext';
import { UnifiedLiveMap } from '../components/map/UnifiedLiveMap';
import {
  getExpeditionTrackedPersonnel,
  getExpeditionStations,
  getExpeditionShipments,
} from '../services/expeditionService';
import './AdminDashboard.css';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
  onCreateExpedition?: () => void;
}

interface MapMarkerInfo {
  id: string;
  name: string;
  type: 'station' | 'field-team' | 'shipment';
  status: string;
  subtext: string;
  coordinates: string;
  sector: string;
  details: string;
  actionPath: string;
  actionLabel: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { currentExpedition, dashboard } = useExpedition();
  const [data, setData] = useState<AdminGlobalSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerInfo | null>(null);
  const [currentTime, setCurrentTime] = useState({
    date: 'Tuesday, 26 Nov 2024',
    utc: '14:32 UTC',
  });

  const dashboardPersonnel = useMemo(() => {
    if (!currentExpedition) return [];
    return getExpeditionTrackedPersonnel(currentExpedition);
  }, [currentExpedition]);

  const dashboardStations = useMemo(() => {
    if (!currentExpedition) return [];
    return getExpeditionStations(currentExpedition, dashboard?.stations || []);
  }, [currentExpedition, dashboard?.stations]);

  const dashboardShipments = useMemo(() => {
    if (!currentExpedition) return [];
    return getExpeditionShipments(currentExpedition);
  }, [currentExpedition]);

  useEffect(() => {
    loadData();
    updateUtcClock();
    const interval = setInterval(updateUtcClock, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateUtcClock = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    setCurrentTime({
      date: dateStr,
      utc: `${hours}:${mins} UTC`,
    });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchAdminSummary();
      setData(res);
    } catch (err) {
      console.warn('Using baseline demo operational telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Operational metrics matching the required specifications and demo dataset
  const kpi = {
    activeExpeditions: data?.kpi?.activeExpeditions ?? 3,
    activeExpeditionsField: 1,
    activeExpeditionsPlanning: 2,
    totalPersonnel: data?.kpi?.totalPersonnel ?? 86,
    personnelField: 62,
    personnelStations: 24,
    pendingRequirements: 12,
    requirementsCritical: 4,
    requirementsHigh: 5,
    ongoingShipments: 5,
    shipmentsInTransit: 2,
    shipmentsDelayed: 1,
  };

  // Map markers for Antarctica Operations Map
  const mapMarkers: MapMarkerInfo[] = [
    {
      id: 'maitri-station',
      name: 'Maitri Station',
      type: 'station',
      status: 'Operational',
      subtext: '12 personnel at station',
      coordinates: '70°45\'57" S, 11°44\'09" E',
      sector: 'Queen Maud Land (Schirmacher Oasis)',
      details: 'Life support systems 100% nominal. Fuel reserve 84%. Communication link satellite verified.',
      actionPath: '/stations',
      actionLabel: 'View Station Details',
    },
    {
      id: 'bharati-station',
      name: 'Bharati Station',
      type: 'station',
      status: 'Operational',
      subtext: '18 personnel at station',
      coordinates: '69°24\'28" S, 76°11\'14" E',
      sector: 'Larsemann Hills, East Antarctica',
      details: 'Active atmospheric & oceanographic research. Automated wastewater recycling operational.',
      actionPath: '/stations',
      actionLabel: 'View Station Details',
    },
    {
      id: 'amery-survey',
      name: 'Amery Ice Shelf Survey',
      type: 'field-team',
      status: 'In Field Traverse',
      subtext: '6 members in field',
      coordinates: '70°12\'18" S, 72°30\'45" E',
      sector: 'Amery Basin Sector 4',
      details: 'Dr. Rajesh Nair leading. PB-07 Snowcat traverse executing glaciological core sampling. Telemetry updated 12m ago.',
      actionPath: '/expeditions',
      actionLabel: 'View Expedition Plan',
    },
    {
      id: 'supply-vessel',
      name: 'Supply Vessel',
      type: 'shipment',
      status: 'En route',
      subtext: 'MV Polar Queen · ETA: 4 days',
      coordinates: '62°18\'10" S, 18°45\'20" E',
      sector: 'Southern Ocean Approach',
      details: 'Carrying 140 MT Arctic fuel, generator spare modules, fresh provisions. Ice conditions manageable (2/10 pack).',
      actionPath: '/logistics?tab=tracking',
      actionLabel: 'Track Shipment Journey',
    },
  ];

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto font-sans">
      {/* 1. Header Banner */}
      <div className="admin-header-banner relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Admin'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              Overview of current Antarctic operations.
            </p>
          </div>

          {/* Clean Date & Time Display */}
          <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <div className="text-xs font-semibold text-slate-500">{currentTime.date}</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {currentTime.utc}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-sky-600">
              Antarctica Standard Time
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Row of 4 Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Active Expeditions */}
        <div
          onClick={() => onNavigate('/expeditions')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-sky-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center group-hover:bg-[#0284C7] group-hover:text-white transition">
              <Mountain className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
              <span>↑</span> 1
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Expeditions</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpi.activeExpeditions}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {kpi.activeExpeditionsField} in field <span className="text-slate-300 mx-1">·</span> {kpi.activeExpeditionsPlanning} in planning
            </div>
          </div>
        </div>

        {/* Card 2: Total Personnel */}
        <div
          onClick={() => onNavigate('/personnel')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-sky-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center group-hover:bg-[#0284C7] group-hover:text-white transition">
              <Users className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
              <span>↑</span> 5
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Personnel</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpi.totalPersonnel}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {kpi.personnelField} in field <span className="text-slate-300 mx-1">·</span> {kpi.personnelStations} at stations
            </div>
          </div>
        </div>

        {/* Card 3: Pending Requirements */}
        <div
          onClick={() => onNavigate('/logistics?tab=requirements')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-sky-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center group-hover:bg-[#0284C7] group-hover:text-white transition">
              <Package className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 flex items-center gap-0.5">
              <span>↑</span> 3
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Requirements</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpi.pendingRequirements}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {kpi.requirementsCritical} critical <span className="text-slate-300 mx-1">·</span> {kpi.requirementsHigh} high priority
            </div>
          </div>
        </div>

        {/* Card 4: Ongoing Shipments */}
        <div
          onClick={() => onNavigate('/logistics?tab=tracking')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-sky-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center group-hover:bg-[#0284C7] group-hover:text-white transition">
              <Truck className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
              <span>↑</span> 1
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ongoing Shipments</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpi.ongoingShipments}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {kpi.shipmentsInTransit} in transit <span className="text-slate-300 mx-1">·</span> {kpi.shipmentsDelayed} delayed
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Layout (Two Areas Only) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (60-65%): Antarctica Operations Map */}
        <div className="lg:col-span-7 xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between relative overflow-hidden">
          {/* Map Card Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Antarctica Operations Map</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live view of expeditions, station locations and active shipments.
              </p>
            </div>

            <button
              onClick={() => onNavigate('/live-map')}
              className="px-3 py-1.5 bg-white hover:bg-sky-50 border border-sky-200 text-[#0284C7] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
              title="Open full interactive live telemetry map"
            >
              <span>Open Full Map</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Map Viewport Area using Real Leaflet Map */}
          <div className="relative w-full h-[400px] sm:h-[440px] rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs">
            {currentExpedition ? (
              <UnifiedLiveMap
                selectedExpedition={currentExpedition}
                personnel={dashboardPersonnel}
                stations={dashboardStations}
                shipments={dashboardShipments}
                waypoints={currentExpedition.route || []}
                className="h-full w-full"
                onViewStationProfile={(_stId) => onNavigate('/stations')}
                onViewPersonProfile={(_pId) => onNavigate('/personnel')}
                onSelectShipment={(_sh) => onNavigate('/logistics')}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-100 text-xs text-slate-500 font-normal">
                Loading polar operations telemetry map...
              </div>
            )}
          </div>

          {/* Real Map Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-3 mt-1">
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Station</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Personnel</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>Shipment</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Emergency</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Click any marker to inspect</span>
          </div>
        </div>

        {/* Right Column (35-40%): Critical Alerts & Upcoming Activities */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-5">
          {/* Card 1: Critical Alerts (Max 3-4 alerts) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Critical Alerts</h2>
              <button
                onClick={() => onNavigate('/alerts')}
                className="text-xs font-bold text-[#0284C7] hover:text-sky-700 transition flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Alert 1: Severe Weather Warning (Critical) */}
              <div
                onClick={() => onNavigate('/alerts')}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">Severe Weather Warning</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">2 hours ago</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-1">
                    High wind speeds near Queen Maud Land. Field teams advised to follow safety protocol.
                  </p>
                </div>
              </div>

              {/* Alert 2: Equipment Maintenance Due (High) */}
              <div
                onClick={() => onNavigate('/alerts')}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">Equipment Maintenance Due</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">5 hours ago</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-1">
                    Generator service due at Bharati Station.
                  </p>
                </div>
              </div>

              {/* Alert 3: Shipment Delayed (Medium) */}
              <div
                onClick={() => onNavigate('/logistics?tab=tracking')}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">Shipment Delayed</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">1 day ago</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-1">
                    Medical supplies delayed by 4 days. New ETA: 23 Oct.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Upcoming Activities (Compact Timeline List) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Upcoming Activities</h2>
              <button
                onClick={() => onNavigate('/expeditions')}
                className="text-xs font-bold text-[#0284C7] hover:text-sky-700 transition flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Activity 1 */}
              <div
                onClick={() => onNavigate('/expeditions')}
                className="flex items-start gap-3 text-xs hover:bg-slate-50/80 p-2 rounded-xl transition cursor-pointer group"
              >
                <span className="text-[11px] font-bold text-slate-400 w-14 shrink-0 pt-0.5">
                  28 Nov
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0 ring-4 ring-blue-50"></span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition truncate">
                    Amery Expedition – Field Survey
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Team departure from Bharati Station
                  </p>
                </div>
              </div>

              {/* Activity 2 */}
              <div
                onClick={() => onNavigate('/inventory')}
                className="flex items-start gap-3 text-xs hover:bg-slate-50/80 p-2 rounded-xl transition cursor-pointer group"
              >
                <span className="text-[11px] font-bold text-slate-400 w-14 shrink-0 pt-0.5">
                  30 Nov
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-4 ring-emerald-50"></span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-xs group-hover:text-emerald-600 transition truncate">
                    Inventory Review – Maitri
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Monthly inventory audit
                  </p>
                </div>
              </div>

              {/* Activity 3 */}
              <div
                onClick={() => onNavigate('/logistics')}
                className="flex items-start gap-3 text-xs hover:bg-slate-50/80 p-2 rounded-xl transition cursor-pointer group"
              >
                <span className="text-[11px] font-bold text-slate-400 w-14 shrink-0 pt-0.5">
                  2 Dec
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0 ring-4 ring-amber-50"></span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-xs group-hover:text-amber-600 transition truncate">
                    Logistics Planning Meeting
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Review upcoming expedition requirements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

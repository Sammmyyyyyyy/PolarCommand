import React, { useState, useEffect } from 'react';
import {
  Compass,
  Building2,
  Users,
  Box,
  CloudSnow,
  Maximize2,
  Plus,
  Minus,
  ArrowUpRight,
  ChevronRight,
  AlertTriangle,
  Flame,
  Wind,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Package,
  Truck,
  Globe,
  Radio,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { fetchAdminSummary, fulfillRestockWithCargo } from '../services/api';
import { AdminGlobalSummary, RestockRequest } from '../types';
import { useAuth } from '../context/AuthContext';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
  onCreateExpedition?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onCreateExpedition }) => {
  const { canCreateExpedition } = useAuth();
  const [data, setData] = useState<AdminGlobalSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [selectedRestock, setSelectedRestock] = useState<RestockRequest | null>(null);
  const [isFulfillingCargo, setIsFulfillingCargo] = useState<boolean>(false);
  const [cargoCode, setCargoCode] = useState<string>('');
  const [transportMode, setTransportMode] = useState<string>('Vessel');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchAdminSummary();
      setData(res);
    } catch (err) {
      console.warn('Failed to load admin summary from API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRestockModal = (restock: RestockRequest) => {
    setSelectedRestock(restock);
    setCargoCode(`CRG-${restock.item?.category?.toUpperCase().slice(0, 3) || 'SPL'}-${Math.floor(1000 + Math.random() * 9000)}`);
    setTransportMode('Vessel');
    setAdminNotes(`Priority replenishment dispatch assigned by Admin for ${restock.station?.name || 'Station'}.`);
  };

  const handleFulfillCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestock) return;

    try {
      setIsFulfillingCargo(true);
      await fulfillRestockWithCargo(selectedRestock.id, {
        cargoCode,
        transportMode,
        description: `Restock Cargo: ${selectedRestock.requestedQuantity} ${selectedRestock.item?.unit || 'units'} ${selectedRestock.item?.itemName} for ${selectedRestock.station?.name}`,
        adminNotes,
        eta: new Date(Date.now() + 86400000 * 5).toISOString(),
      });
      setToastMsg(`Successfully placed Cargo Operation ${cargoCode} for ${selectedRestock.station?.name}!`);
      setSelectedRestock(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch cargo');
    } finally {
      setIsFulfillingCargo(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs font-semibold">Synchronizing with Antarctica Mission Control Telemetry...</div>
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || {
    activeExpeditions: 12,
    totalExpeditions: 18,
    activeExpeditionsChange: '+2',
    stationsCount: 4,
    totalPersonnel: 86,
    personnelChange: '+5',
    activeEquipment: 142,
    totalEquipment: 168,
    equipmentChange: '+8',
    antarcticaWeather: { tempCelsius: -18, condition: 'Light Snow', windSpeed: '22 km/h', humidity: '68%' },
  };

  const donut = data?.expeditionStatusDistribution || { active: 12, planning: 3, completed: 8, onHold: 2 };
  const personnelDist = data?.personnelDistribution || { stationManagers: 4, expeditionLeaders: 12, teamMembers: 62, supportStaff: 8, total: 86 };
  const stationsList = data?.stations || [];
  const expeditionsList = data?.recentExpeditions || [];
  const alertsList = data?.criticalAlerts || [];
  const activityList = data?.recentActivity || [];
  const pendingRestocks = data?.pendingRestocks || [];

  return (
    <div className="space-y-5 pb-8 font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-600 hover:text-emerald-900 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Welcome Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome back, Admin</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Global overview of all polar operations, expeditions and stations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* System Status Pill */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs text-xs font-medium text-slate-700">
            <Globe className="w-4 h-4 text-blue-600" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-bold uppercase leading-none">System Status</div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 leading-none mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>All Systems Operational</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </div>
            </div>
          </div>

          {/* "+ Create Expedition" Button - STRICT ADMIN ONLY */}
          {canCreateExpedition && (
            <button
              onClick={() => {
                if (onCreateExpedition) onCreateExpedition();
                else onNavigate('/expeditions/new');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 hover:shadow-md transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Expedition</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 5 KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Active Expeditions */}
        <div
          onClick={() => onNavigate('/expeditions')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
              <span>↑</span> {kpi.activeExpeditionsChange}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{kpi.activeExpeditions}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Active Expeditions <span className="text-slate-400">• of {kpi.totalExpeditions} total</span>
          </div>
        </div>

        {/* KPI 2: Stations */}
        <div
          onClick={() => onNavigate('/stations')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              - 0
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{kpi.stationsCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Stations <span className="text-slate-400">• Across Antarctica</span>
          </div>
        </div>

        {/* KPI 3: Total Personnel */}
        <div
          onClick={() => onNavigate('/personnel')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
              <span>↑</span> {kpi.personnelChange}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{kpi.totalPersonnel}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Total Personnel <span className="text-slate-400">• Active in field & stations</span>
          </div>
        </div>

        {/* KPI 4: Active Equipment */}
        <div
          onClick={() => onNavigate('/assets')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
              <Box className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
              <span>↑</span> {kpi.equipmentChange}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2.5">{kpi.activeEquipment}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Active Equipment <span className="text-slate-400">• of {kpi.totalEquipment} total</span>
          </div>
        </div>

        {/* KPI 5: Antarctica (Overview) Weather */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Antarctica (Overview)</span>
            <CloudSnow className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{kpi.antarcticaWeather.tempCelsius}°C</span>
            <span className="text-xs font-semibold text-slate-600">{kpi.antarcticaWeather.condition}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100">
            <span>Wind {kpi.antarcticaWeather.windSpeed}</span>
            <span>Humidity {kpi.antarcticaWeather.humidity}</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Map (left 50%), Expedition Status & Donut (middle 25%), Critical Alerts (right 25%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Column 1: Antarctica Stations & Active Expeditions Map (6 cols = 50%) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between overflow-hidden relative min-h-[380px]">
          <div className="flex items-start justify-between z-10">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Stations & Active Expeditions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live view of all stations and ongoing expeditions across Antarctica.
              </p>
            </div>

            {/* Map Controls */}
            <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200 shadow-2xs">
              <button
                onClick={() => setMapZoom(1)}
                className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMapZoom((z) => Math.min(z + 0.2, 1.8))}
                className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                title="Zoom In"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMapZoom((z) => Math.max(z - 0.2, 0.7))}
                className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                title="Zoom Out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Visual Antarctic Map Treatment matching the uploaded reference image */}
          <div className="flex-1 w-full relative flex items-center justify-center my-3 overflow-hidden rounded-xl bg-gradient-to-tr from-[#99c8f5]/40 via-[#d3e9fd]/50 to-[#bde0fe]/40 border border-sky-100 min-h-[280px]">
            {/* Soft Ocean texture / grid */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: 'radial-gradient(#0284C7 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            ></div>

            {/* Antarctica Continent Silhouette Illustration */}
            <div
              className="relative w-full h-full flex items-center justify-center transition-transform duration-300"
              style={{ transform: `scale(${mapZoom})` }}
            >
              {/* Antarctica landmass shape SVG */}
              <svg viewBox="0 0 500 320" className="w-[92%] h-[92%] drop-shadow-md">
                <defs>
                  <linearGradient id="iceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="45%" stopColor="#F0F8FF" />
                    <stop offset="85%" stopColor="#E1F0FE" />
                    <stop offset="100%" stopColor="#C9E6FD" />
                  </linearGradient>
                </defs>

                {/* Antarctica Landmass */}
                <path
                  d="M110,135 Q130,85 200,80 Q290,65 370,110 Q420,140 435,190 Q440,240 370,265 Q300,285 220,270 Q145,260 115,215 Q95,175 110,135 Z"
                  fill="url(#iceGradient)"
                  stroke="#BAE6FD"
                  strokeWidth="2"
                />

                {/* Antarctic Peninsula tail */}
                <path
                  d="M125,135 Q90,95 85,55 Q100,50 115,80 Q130,110 135,128 Z"
                  fill="url(#iceGradient)"
                  stroke="#BAE6FD"
                  strokeWidth="1.5"
                />

                {/* Ross Ice Shelf notch */}
                <path
                  d="M260,270 Q280,240 310,245 Q340,250 355,270 Z"
                  fill="#A5D8F9"
                  opacity="0.6"
                />

                {/* Dashed Traverse Routes between stations */}
                {/* Route: Maitri -> Bharati */}
                <path
                  d="M185,115 Q260,110 350,150"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                />
                {/* Route: Bharati -> Dakshin Gangotri */}
                <path
                  d="M350,150 Q365,195 345,230"
                  fill="none"
                  stroke="#EAB308"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                />
                {/* Route: Dakshin Gangotri -> Research Site A */}
                <path
                  d="M345,230 Q280,210 200,215"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                />
                {/* Route: Research Site A -> Maitri */}
                <path
                  d="M200,215 Q170,170 185,115"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                />

                {/* Expedition field waypoints / active moving camps */}
                <circle cx="270" cy="125" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="340" cy="185" r="4" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="285" cy="225" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>

              {/* Station Label Overlays matching the uploaded design */}
              {/* 1. Maitri Station Label */}
              <div className="absolute top-[28%] left-[26%] -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white shadow-md text-[10px] font-bold border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Maitri Station</span>
                  <span className="text-slate-400 font-normal">12 personnel</span>
                </div>
              </div>

              {/* 2. Bharati Station Label */}
              <div className="absolute top-[40%] right-[16%] -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white shadow-md text-[10px] font-bold border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Bharati Station</span>
                  <span className="text-slate-400 font-normal">18 personnel</span>
                </div>
              </div>

              {/* 3. Dakshin Gangotri Label */}
              <div className="absolute bottom-[24%] right-[22%] -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white shadow-md text-[10px] font-bold border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Dakshin Gangotri</span>
                  <span className="text-slate-400 font-normal">8 personnel</span>
                </div>
              </div>

              {/* 4. Research Site A Label */}
              <div className="absolute bottom-[28%] left-[28%] -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white shadow-md text-[10px] font-bold border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Research Site A</span>
                  <span className="text-slate-400 font-normal">6 personnel</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Operational Station
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Active Traverse
              </span>
            </span>
            <span className="text-slate-400">Satellite Telemetry Refreshed 12s ago</span>
          </div>
        </div>

        {/* Column 2: Expedition Status Donut & Personnel Distribution (3 cols = 25%) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-900 tracking-tight">Expedition Status</h2>
              <button
                onClick={() => onNavigate('/expeditions')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Donut Chart visual */}
            <div className="flex items-center justify-between mt-3 px-1">
              {/* Donut graphic */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#F1F5F9" strokeWidth="4.5" />
                  {/* Completed: 8/25 = 32% (green) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4.5"
                    strokeDasharray="32 68"
                    strokeDashoffset="0"
                  />
                  {/* Planning: 3/25 = 12% (cyan) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="4.5"
                    strokeDasharray="12 88"
                    strokeDashoffset="-32"
                  />
                  {/* On Hold: 2/25 = 8% (amber) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="4.5"
                    strokeDasharray="8 92"
                    strokeDashoffset="-44"
                  />
                  {/* Active: 12/25 = 48% (blue) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="4.5"
                    strokeDasharray="48 52"
                    strokeDashoffset="-52"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-slate-900 leading-none">{donut.active}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Active</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Active
                  </span>
                  <span className="font-bold text-slate-900">{donut.active}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Planning
                  </span>
                  <span className="font-bold text-slate-900">{donut.planning}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed
                  </span>
                  <span className="font-bold text-slate-900">{donut.completed}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> On Hold
                  </span>
                  <span className="font-bold text-slate-900">{donut.onHold}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Personnel Distribution */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-extrabold text-slate-900">Personnel Distribution</span>
              <span className="text-slate-400 font-semibold">Total: {personnelDist.total}</span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-600 font-medium mb-0.5">
                  <span>Station Managers</span>
                  <span className="font-bold text-slate-800">{personnelDist.stationManagers}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '8%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 font-medium mb-0.5">
                  <span>Expedition Leaders</span>
                  <span className="font-bold text-slate-800">{personnelDist.expeditionLeaders}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: '18%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 font-medium mb-0.5">
                  <span>Team Members</span>
                  <span className="font-bold text-slate-800">{personnelDist.teamMembers}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '72%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 font-medium mb-0.5">
                  <span>Support Staff</span>
                  <span className="font-bold text-slate-800">{personnelDist.supportStaff}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Critical Alerts & Inventory Shortages (3 cols = 25%) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-extrabold text-slate-900 tracking-tight">Critical Alerts</h2>
              <button
                onClick={() => onNavigate('/alerts')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alerts List matching the design reference image */}
            <div className="space-y-2.5">
              {alertsList.map((alert: any, idx: number) => {
                const isWeather = alert.title.toLowerCase().includes('weather');
                const isEquipment = alert.title.toLowerCase().includes('equipment') || alert.title.toLowerCase().includes('generator');
                const isPersonnel = alert.title.toLowerCase().includes('personnel') || alert.title.toLowerCase().includes('check-in');
                const isShortage = alert.title.toLowerCase().includes('shortage') || alert.title.toLowerCase().includes('fuel');

                return (
                  <div
                    key={alert.id || idx}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white transition flex items-start gap-2.5 text-xs"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                        isWeather
                          ? 'bg-rose-50 text-rose-600'
                          : isEquipment
                          ? 'bg-amber-50 text-amber-600'
                          : isPersonnel
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {isWeather && <Wind className="w-4 h-4" />}
                      {isEquipment && <AlertTriangle className="w-4 h-4" />}
                      {isPersonnel && <ShieldAlert className="w-4 h-4" />}
                      {isShortage && <Flame className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate">{alert.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">{alert.time || 'Recent'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                        {alert.desc || alert.reason || alert.impact}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Restock Shortage Banner if any exist */}
          {pendingRestocks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <div>
                  <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>{pendingRestocks.length} Restock Shortage Waiting</span>
                  </div>
                  <div className="text-[11px] text-amber-700 mt-0.5">
                    {pendingRestocks[0].station?.name}: {pendingRestocks[0].item?.itemName}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenRestockModal(pendingRestocks[0])}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition"
                >
                  Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row (3 Columns matching design reference) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Recent Expeditions Table (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-extrabold text-slate-900 tracking-tight">Recent Expeditions</h2>
              <button
                onClick={() => onNavigate('/expeditions')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Leader</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px]">
                  {expeditionsList.map((exp: any, i: number) => (
                    <tr key={exp.id || i} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[130px]">{exp.name}</span>
                      </td>
                      <td className="py-2.5 text-slate-600 truncate max-w-[100px]">{exp.leader}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            exp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : exp.status === 'Planning'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              exp.status === 'Active' ? 'bg-emerald-500' : exp.status === 'Planning' ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                          ></span>
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[10px]">{exp.timeline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 2: Stations Overview Table (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-extrabold text-slate-900 tracking-tight">Stations Overview</h2>
              <button
                onClick={() => onNavigate('/stations')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="pb-2 font-medium">Station</th>
                    <th className="pb-2 font-medium">Personnel</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Weather</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px]">
                  {stationsList.map((st: any, i: number) => (
                    <tr key={st.id || i} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[100px]">{st.name}</span>
                      </td>
                      <td className="py-2.5 text-slate-600 font-medium">
                        {st.personnelCount}/{st.maxCapacity}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            st.status === 'Operational'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600 flex items-center gap-1 font-medium">
                        <CloudSnow className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{st.weatherTemp}°C</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Card 3: Recent Activity (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-extrabold text-slate-900 tracking-tight">Recent Activity</h2>
              <button
                onClick={() => onNavigate('/alerts')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {activityList.slice(0, 5).map((act: any, i: number) => {
                const isExp = act.type === 'expedition';
                const isPersonnel = act.type === 'personnel';
                const isWeather = act.type === 'weather';

                return (
                  <div key={act.id || i} className="flex items-start gap-2.5 relative pl-5 text-xs">
                    <span
                      className={`absolute left-1 top-1 w-2.5 h-2.5 rounded-full ring-3 ring-white ${
                        isExp
                          ? 'bg-blue-600'
                          : isPersonnel
                          ? 'bg-emerald-500'
                          : isWeather
                          ? 'bg-amber-500'
                          : 'bg-blue-400'
                      }`}
                    ></span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate text-[11px]">{act.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">{act.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-1">{act.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Restock Shortage Cargo Modal */}
      {selectedRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Review Inventory Shortage & Dispatch Cargo</h3>
                  <p className="text-xs text-slate-500">{selectedRestock.station?.name} Station Request</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRestock(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5 text-xs text-amber-900">
              <div className="flex justify-between font-bold">
                <span>Requested Item:</span>
                <span>{selectedRestock.item?.itemName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current Station Stock:</span>
                <span>{selectedRestock.currentQuantity} {selectedRestock.item?.unit}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Minimum Safety Threshold:</span>
                <span>{selectedRestock.minimumQuantity} {selectedRestock.item?.unit}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold">
                <span>Requested Replenishment:</span>
                <span>{selectedRestock.requestedQuantity} {selectedRestock.item?.unit}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Submitted by:</span>
                <span>{selectedRestock.requestedByName}</span>
              </div>
            </div>

            <form onSubmit={handleFulfillCargo} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Cargo Consignment Code</label>
                <input
                  type="text"
                  value={cargoCode}
                  onChange={(e) => setCargoCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transport Mode</label>
                  <select
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="Vessel">Vessel (MV Polar Queen)</option>
                    <option value="Snow Vehicle">Snowcat (PistenBully PB-07)</option>
                    <option value="Air">Ski-Plane (Twin Otter)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Arrival</label>
                  <input
                    type="text"
                    readOnly
                    value="5 days (Standard Ice Transit)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-100 text-xs text-slate-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mission Control Directive / Notes</label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRestock(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFulfillingCargo}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Package className="w-4 h-4" />
                  <span>{isFulfillingCargo ? 'Dispatching...' : 'Place Cargo Operation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

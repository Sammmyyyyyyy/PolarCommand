import React, { useState } from 'react';
import {
  Building2,
  CloudSnow,
  Wind,
  Eye,
  Users,
  Boxes,
  Truck,
  Package,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { Station, InventoryItem, Asset, Personnel } from '../types';

interface StationOverviewProps {
  stations: Station[];
  inventoryList: InventoryItem[];
  assetsList: Asset[];
  personnelList: Personnel[];
  onNavigate?: (path: string) => void;
}

export const StationOverview: React.FC<StationOverviewProps> = ({
  stations,
  inventoryList,
  assetsList,
  personnelList,
  onNavigate,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string>('bharati');
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'assets' | 'personnel' | 'cargo' | 'weather'>('overview');

  const station = stations.find((s) => s.id === selectedStationId) || stations[0];
  if (!station) return null;

  const stationInventory = inventoryList.filter((i) => i.stationId === station.id);
  const stationAssets = assetsList.filter((a) => a.stationId === station.id);
  const stationPersonnel = personnelList.filter((p) => p.stationId === station.id || p.currentLocation.toLowerCase().includes(station.id));

  const isHighRisk = (station.stationRisk ?? 0) > 60 || station.riskLevel === 'High Risk';

  return (
    <div className="space-y-6">
      {/* Top Header & Station Switcher matching Screen 10 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Station Overview ({station.name.replace(' Station', '')})
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold border uppercase font-mono ${
                isHighRisk
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {station.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {station.region} • Coordinates: {station.coordinates?.lat ?? station.latitude ?? station.lat ?? 0}°, {station.coordinates?.lng ?? station.longitude ?? station.lng ?? 0}°
          </p>
        </div>

        {/* Station Tabs Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold overflow-x-auto">
          {stations.length === 0 ? (
            <div className="px-3 py-1.5 text-slate-400">No stations registered</div>
          ) : (
            stations.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStationId(st.id)}
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap ${
                  selectedStationId.toLowerCase() === st.id.toLowerCase() ||
                  (!stations.some((s) => s.id === selectedStationId) && st.id === stations[0].id)
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Station Visual Header Card matching Screen 10 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-sky-400">
              Antarctic Research Base
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-1">{station.name}</h2>
            <div className="flex items-center space-x-3 text-xs text-slate-300 mt-2">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>{station.region}</span>
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400">
                {station.coordinates?.lat ?? station.latitude ?? station.lat ?? 0}° S, {station.coordinates?.lng ?? station.longitude ?? station.lng ?? 0}° E
              </span>
            </div>
          </div>

          {/* Weather Snapshot Box */}
          <div className="flex items-center space-x-4 bg-slate-800/80 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/80 text-xs">
            <div className="text-center pr-3 border-r border-slate-700">
              <div className="text-2xl font-black font-mono text-sky-300">
                {station.weather.temperature}°C
              </div>
              <div className="text-[10px] text-slate-400">{station.weather.condition}</div>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex items-center space-x-1.5">
                <Wind className="w-3.5 h-3.5 text-slate-400" />
                <span>Wind: <strong className="text-white">{station.weather.windSpeed} km/h</strong></span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Visibility: <strong className="text-white">{station.weather.visibility}</strong></span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono italic">
                {station.weather.lastUpdated}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs matching Screen 10 */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'inventory', label: 'Station Inventory' },
          { id: 'assets', label: 'Operational Assets' },
          { id: 'personnel', label: 'Present Personnel' },
          { id: 'weather', label: 'Operational Weather' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Bar Strip matching Screen 10 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Personnel</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">{station.personnelPresent}</span>
          <span className="text-[10px] text-slate-500">Scientists & winterers</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Inventory Readiness</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">{station.inventoryReadiness}%</span>
          <span className="text-[10px] text-slate-500">Operational buffer</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Assets Active</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {station.operationalAssets?.operational ?? stationAssets.filter((a) => a.status === 'Operational').length}/{station.operationalAssets?.total ?? stationAssets.length}
          </span>
          <span className="text-[10px] text-slate-500">Fleet operational</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Incoming Cargo</span>
          <span className="text-xl font-black text-sky-600 mt-1 block">{station.incomingCargoCount}</span>
          <span className="text-[10px] text-slate-500">En route via sea/air</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Open Incidents</span>
          <span className="text-xl font-black text-rose-600 mt-1 block">{station.openIncidentsCount}</span>
          <span className="text-[10px] text-slate-500">Tracked in field</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block">Station Risk</span>
          <span
            className={`text-xl font-black mt-1 block ${
              isHighRisk ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {station.stationRisk} / 100
          </span>
          <span
            className={`text-[10px] font-bold ${
              isHighRisk ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {isHighRisk ? 'HIGH RISK' : 'STABLE'}
          </span>
        </div>
      </div>

      {/* Tab Specific Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3 text-xs">
            <div className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
              Critical Life Support & Power Systems
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-semibold text-slate-700">Prime Power Plant (Cummins Gen A)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Online (50 Hz)
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-semibold text-slate-700">Auxiliary Heating System</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Nominal (+19°C indoor)
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-semibold text-slate-700">Snow-melt Water RO Circuit</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  1,200 L/day output
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                <span className="font-semibold text-slate-700">Satellite Comm Link (C-Band)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  20 Mbps Synced
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3 text-xs">
            <div className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
              Ongoing Science Experiments
            </div>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Atmospheric trace gas & ozone profile monitoring</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Southern Ocean bio-geochemical glider telemetry</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Geomagnetic pulsation & auroral optical spectroscopy</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Deep continental ice-shelf velocity measurement</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="font-extrabold text-sm text-slate-900 mb-3">
            {station.name} Consumables Manifest
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {stationInventory.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="font-bold text-sky-700">{item.category}</div>
                <div className="text-slate-900 font-medium">{item.itemName}</div>
                <div className="text-slate-600 mt-1 font-mono">
                  Stock: {item.currentStock.toLocaleString()} {item.unit}
                </div>
                <div className="text-[11px] font-bold text-slate-700">
                  {item.daysRemaining} days remaining
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

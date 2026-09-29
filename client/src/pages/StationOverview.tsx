import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Users,
  Boxes,
  ArrowRight,
  ArrowLeft,
  Shield,
  Radio,
  Thermometer,
  Wind,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getAllPolarStations, StationFullRecord, sendStationManagerAlert } from '../services/stationService';
import { useAuth } from '../context/AuthContext';
import { getUserScope } from '../utils/userScope';

interface StationOverviewProps {
  initialStationId?: string;
  onNavigate?: (path: string) => void;
}

export const StationOverview: React.FC<StationOverviewProps> = ({ initialStationId, onNavigate }) => {
  const { currentUser, isStationManager } = useAuth();
  const scope = getUserScope(currentUser);

  const [stations, setStations] = useState<StationFullRecord[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationFullRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'personnel' | 'inventory' | 'expeditions'>('overview');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await getAllPolarStations();
        if (isMounted) {
          const scoped = scope.filterStations(data);
          setStations(scoped);

          if (scope.isStationManager) {
            // Station Manager is strictly scoped to their assigned station
            setSelectedStation(scoped[0] || null);
          } else {
            const urlParams = new URLSearchParams(window.location.search);
            const paramId = initialStationId || urlParams.get('station');
            if (paramId && scoped.length > 0) {
              const cleanId = paramId.toLowerCase().replace(/^st-/, '');
              const found = scoped.find(
                (s) =>
                  s.id.toLowerCase() === paramId.toLowerCase() ||
                  s.id.toLowerCase() === `st-${cleanId}` ||
                  s.code.toLowerCase() === cleanId ||
                  s.name.toLowerCase().includes(cleanId)
              );
              if (found) setSelectedStation(found);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load polar stations:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [initialStationId, currentUser?.id, currentUser?.role]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center space-y-4 font-sans">
        <div className="w-10 h-10 border-3 border-sky-200 border-t-[#0284C7] rounded-full animate-spin mx-auto" />
        <p className="text-xs font-normal text-slate-500">Connecting to Antarctic station telemetry...</p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: DEDICATED STATION DETAILS VIEW
  // -------------------------------------------------------------
  if (selectedStation) {
    const weather = selectedStation.weather?.[0] || {
      temperature: -18,
      condition: 'Clear, Katabatic Winds',
      windSpeedKnots: 22,
      visibility: '15 km',
    };

    const categories = Object.keys(selectedStation.categorizedInventory || {});
    const filteredInventoryItems =
      inventoryCategoryFilter === 'ALL'
        ? Object.values(selectedStation.categorizedInventory || {}).flat()
        : selectedStation.categorizedInventory?.[inventoryCategoryFilter] || [];

    return (
      <div className="space-y-6 pb-16 max-w-7xl mx-auto font-sans select-none">
        {/* Back Button & Sub-actions */}
        <div className="flex items-center justify-between">
          {!scope.isStationManager ? (
            <button
              type="button"
              onClick={() => setSelectedStation(null)}
              className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#0284C7]" />
              <span>← Back to All Stations</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
              <Building2 className="w-4 h-4 text-[#0284C7]" />
              <span>Station Operations Command</span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-normal">
              NCPOR Code: {selectedStation.code}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{selectedStation.status}</span>
            </span>
          </div>
        </div>

        {/* Station Hero Header */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                <span>Antarctic Permanent Research Base</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-1">
                {selectedStation.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5 font-normal">
                <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>{selectedStation.region}</span>
                <span>• GPS: {selectedStation.latitude.toFixed(3)}° S, {selectedStation.longitude.toFixed(3)}° E</span>
              </p>
            </div>

            {/* Station Manager Summary Badge - Name Only, NO VHF/Iridium Codes */}
            <div className="bg-sky-50/60 rounded-xl p-3.5 border border-sky-100 min-w-[200px]">
              <div className="text-[11px] uppercase font-medium text-slate-400 tracking-wider">
                Station Manager
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                {selectedStation.stationManager.name}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
              <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <div className="text-sm font-semibold text-slate-900">{selectedStation.personnelCount}</div>
              <div className="text-[11px] text-slate-500 font-normal">Personnel Assigned</div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
              <Boxes className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <div className="text-sm font-semibold text-slate-900">{selectedStation.inventoryCount} items</div>
              <div className="text-[11px] text-slate-500 font-normal">{categories.length} Categories</div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
              <Thermometer className="w-4 h-4 text-sky-500 mx-auto mb-1" />
              <div className="text-sm font-semibold text-slate-900">{weather.temperature}°C</div>
              <div className="text-[11px] text-slate-500 font-normal">{weather.condition}</div>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-center">
              <Layers className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <div className="text-sm font-semibold text-slate-900">{selectedStation.activeExpeditions.length}</div>
              <div className="text-[11px] text-slate-500 font-normal">Active Expeditions</div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b border-slate-200/90 pb-px overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'bg-white text-[#0284C7] font-semibold border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Station Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('personnel')}
            className={`px-4 py-2.5 text-xs rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'personnel'
                ? 'bg-white text-[#0284C7] font-semibold border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Assigned Personnel ({selectedStation.assignedPersonnelList?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 text-xs rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'inventory'
                ? 'bg-white text-[#0284C7] font-semibold border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Station Inventory ({selectedStation.inventoryCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('expeditions')}
            className={`px-4 py-2.5 text-xs rounded-t-xl transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === 'expeditions'
                ? 'bg-white text-[#0284C7] font-semibold border-t-2 border-t-[#0284C7] border-x border-slate-200/90 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Expeditions ({selectedStation.activeExpeditions.length})</span>
          </button>
        </div>

        {/* Tab 1: Station Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Operational Characteristics
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-normal">Governing Body</span>
                  <span className="font-semibold text-slate-800">NCPOR, Ministry of Earth Sciences, Govt. of India</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-normal">Maximum Capacity</span>
                  <span className="font-semibold text-slate-800">{selectedStation.capacity} personnel</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-normal">Primary Comms Relay</span>
                  <span className="font-semibold text-slate-800">Dual Inmarsat / Iridium Polar Gateway</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-normal">Power Infrastructure</span>
                  <span className="font-semibold text-slate-800">3x 125 kVA Volvo Penta Arctic Gensets + Solar Array</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Current Meteorological Context
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-normal">Temperature</span>
                  <span className="font-semibold text-slate-900">{weather.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-normal">Wind Speed</span>
                  <span className="font-semibold text-slate-800">{weather.windSpeedKnots ?? 18} knots</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-normal">Atmospheric Condition</span>
                  <span className="font-semibold text-slate-800">{weather.condition}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 font-normal">Surface Visibility</span>
                  <span className="font-semibold text-slate-800">{weather.visibility || '15 km'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Personnel */}
        {activeTab === 'personnel' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Station Personnel Roster ({selectedStation.assignedPersonnelList?.length || 0})
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedStation.assignedPersonnelList?.map((person) => (
                <div key={person.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-900">{person.name}</span>
                      <span className="text-[11px] text-[#0284C7] font-medium">({person.role})</span>
                    </div>
                    {person.qualification && (
                      <div className="text-[11px] text-slate-500 mt-1 font-normal">{person.qualification}</div>
                    )}
                    {person.contactInfo && (
                      <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center space-x-1 font-normal">
                        <Radio className="w-3 h-3 text-[#0284C7]" />
                        <span>{person.contactInfo}</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 shrink-0">
                    {person.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Inventory */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Categorized Base Inventory ({filteredInventoryItems.length} items)
              </h4>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setInventoryCategoryFilter('ALL')}
                  className={`px-2.5 py-1 text-xs rounded-lg transition cursor-pointer whitespace-nowrap ${
                    inventoryCategoryFilter === 'ALL'
                      ? 'bg-[#0284C7] text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                  }`}
                >
                  All ({selectedStation.inventoryCount})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInventoryCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition cursor-pointer whitespace-nowrap ${
                      inventoryCategoryFilter === cat
                        ? 'bg-[#0284C7] text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium uppercase text-[11px] tracking-wider">
                    <th className="py-2.5 font-medium">Item Name</th>
                    <th className="py-2.5 font-medium">Category</th>
                    <th className="py-2.5 font-medium">Quantity On Hand</th>
                    <th className="py-2.5 font-medium">Status</th>
                    <th className="py-2.5 font-medium">Last Verified</th>
                    <th className="py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-2.5 text-slate-500 font-normal">{item.category}</td>
                      <td className="py-2.5 font-medium text-slate-800">
                        {item.quantity?.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                            item.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'Low'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400 font-mono text-[11px] font-normal">
                        {item.lastUpdated}
                      </td>
                      <td className="py-2.5 text-right space-x-1.5">
                        {scope.isStationManager ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigate) {
                                onNavigate(`/logistics?tab=requirements&station=${selectedStation.id}&item=${encodeURIComponent(item.name)}`);
                              }
                            }}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-[#0284C7] border border-sky-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Add Requirement
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await sendStationManagerAlert({
                                  station: selectedStation,
                                  item: item as any,
                                  message: `Low stock alert for ${item.name}`,
                                });
                                alert(`✓ Alert sent to Station Manager of ${selectedStation.name}`);
                              } catch (err: any) {
                                alert(`Failed to send alert: ${err.message}`);
                              }
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Alert Station Manager
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Active Expeditions */}
        {activeTab === 'expeditions' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Connected Polar Expeditions ({selectedStation.activeExpeditions.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedStation.activeExpeditions.map((exp) => (
                <div key={exp.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-slate-900">{exp.name}</div>
                    <span className="inline-block text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 uppercase">
                      {exp.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate(`/expeditions/${exp.id}`)}
                    className="px-3.5 py-1.5 bg-white hover:bg-sky-50 text-[#0284C7] border border-sky-200 hover:border-sky-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 shadow-2xs shrink-0"
                  >
                    <span>View Expedition</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 1: ALL POLAR STATIONS GRID CARDS (Section 11)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto font-sans select-none">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#0284C7] uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Permanent Polar Infrastructure</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Polar Research Stations
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-normal">
            National Antarctic and Arctic research facilities, winter-over logistics bases, and regional command posts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium px-3 py-1.5 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-200">
            {stations.length} Permanent Bases Active
          </span>
        </div>
      </div>

      {/* Grid of Station Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stations.map((st) => (
          <div
            key={st.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-sky-300 transition flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Card Top: Status & Region */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{st.status}</span>
                </span>
                <span className="text-xs font-mono text-slate-400 font-normal">{st.code}</span>
              </div>

              {/* Station Title & Location */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{st.name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1 font-normal">
                  <MapPin className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                  <span className="truncate">{st.region}</span>
                </p>
              </div>

              {/* Station Manager Row */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-medium">Station Manager</div>
                  <div className="font-semibold text-slate-900">{st.stationManager.name}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                  {st.stationManager.status}
                </span>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50/90 rounded-xl p-2 border border-slate-100">
                  <div className="text-sm font-semibold text-slate-900">{st.personnelCount}</div>
                  <div className="text-[11px] text-slate-500 font-normal">Personnel</div>
                </div>
                <div className="bg-slate-50/90 rounded-xl p-2 border border-slate-100">
                  <div className="text-sm font-semibold text-slate-900">{st.inventoryCount}</div>
                  <div className="text-[11px] text-slate-500 font-normal">Inventory</div>
                </div>
                <div className="bg-slate-50/90 rounded-xl p-2 border border-slate-100">
                  <div className="text-sm font-semibold text-slate-900">{st.activeExpeditions.length}</div>
                  <div className="text-[11px] text-slate-500 font-normal">Expeditions</div>
                </div>
              </div>

              {/* Active Expeditions Pills */}
              <div>
                <div className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">
                  Active Expeditions
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {st.activeExpeditions.map((exp) => (
                    <span
                      key={exp.id}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-sky-50 text-[#0284C7] border border-sky-100 truncate max-w-full"
                    >
                      {exp.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono font-normal">
                {st.latitude.toFixed(2)}° S, {st.longitude.toFixed(2)}° E
              </span>
              <button
                type="button"
                onClick={() => setSelectedStation(st)}
                className="px-4 py-2 bg-[#0284C7] hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>View Station</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Boxes,
  Package,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Compass,
  Users,
  Radio,
  Flame,
  Battery,
  CloudSnow,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Truck,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserScope } from '../utils/userScope';
import {
  fetchStations,
  fetchStationInventory,
  createStationInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  requestItemRestock,
  fetchRestockRequests,
  fetchExpeditions,
} from '../services/api';
import { Station, InventoryItem, RestockRequest, Expedition } from '../types';

interface StationManagerDashboardProps {
  onNavigate?: (path: string) => void;
}

export const StationManagerDashboard: React.FC<StationManagerDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();

  // State
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVENTORY' | 'RESTOCK' | 'EXPEDITIONS'>('OVERVIEW');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter / Search for inventory
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal State: Add / Edit Item
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [isSavingItem, setIsSavingItem] = useState<boolean>(false);
  const [itemForm, setItemForm] = useState({
    itemName: '',
    category: 'Fuel',
    currentStock: 100,
    unit: 'L',
    minThreshold: 200,
    optimalStock: 500,
    notes: '',
  });

  // Modal State: Restock Request
  const [isRestockModalOpen, setIsRestockModalOpen] = useState<boolean>(false);
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItem | null>(null);
  const [isSubmittingRestock, setIsSubmittingRestock] = useState<boolean>(false);
  const [restockForm, setRestockForm] = useState({
    requestedQuantity: 500,
    priority: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    notes: '',
  });

  // Initial Load: Stations & identify user's assigned station
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const [stationRes, expRes] = await Promise.all([
          fetchStations(),
          fetchExpeditions(),
        ]);
        setStations(stationRes);
        setExpeditions(expRes);

        // Determine default station: user's assigned station via scope
        const scope = getUserScope(currentUser);
        let defaultStId = stationRes[0]?.id || '';
        if (scope.primaryStationId) {
          const userSt = stationRes.find(
            (s) =>
              s.id === scope.primaryStationId ||
              s.code?.toLowerCase() === scope.primaryStationId?.toLowerCase() ||
              s.name.toLowerCase().includes(scope.primaryStationId?.toLowerCase() || '')
          );
          if (userSt) defaultStId = userSt.id;
        }
        setSelectedStationId(defaultStId);
      } catch (err) {
        console.error('Failed to load stations:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [currentUser]);

  // Load Inventory & Restock Requests whenever selected station changes
  useEffect(() => {
    if (!selectedStationId) return;
    loadStationData(selectedStationId);
  }, [selectedStationId]);

  const loadStationData = async (stationId: string) => {
    try {
      setIsRefreshing(true);
      const [invRes, reqRes] = await Promise.all([
        fetchStationInventory(stationId),
        fetchRestockRequests({ stationId }),
      ]);
      setInventory(invRes);
      setRestockRequests(reqRes);
    } catch (err) {
      console.error('Failed to load station inventory & restock data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentStation = stations.find((s) => s.id === selectedStationId) || stations[0];

  // Auto-calculated inventory health
  const lowItems = inventory.filter((item) => {
    const status = (item.status || '').toUpperCase();
    return status === 'LOW' || status === 'CRITICAL' || item.currentStock <= (item.minThreshold || 50);
  });
  const criticalItems = inventory.filter((item) => {
    const status = (item.status || '').toUpperCase();
    return status === 'CRITICAL' || item.currentStock < (item.minThreshold || 50) * 0.5;
  });

  // Expeditions linked to this station
  const stationExpeditions = expeditions.filter((exp) => {
    const expName = exp.name || exp.title || '';
    const stNameLower = (currentStation?.name || '').toLowerCase().split(' ')[0];
    return (
      exp.startStationId === selectedStationId ||
      exp.endStationId === selectedStationId ||
      (exp.stationIds && exp.stationIds.includes(selectedStationId)) ||
      (exp.stations && exp.stations.some((s) => s.id === selectedStationId)) ||
      (stNameLower && expName.toLowerCase().includes(stNameLower))
    );
  });

  // Handle Add Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStationId) return;
    try {
      setIsSavingItem(true);
      await createStationInventoryItem(selectedStationId, {
        itemName: itemForm.itemName,
        category: itemForm.category,
        currentStock: Number(itemForm.currentStock),
        unit: itemForm.unit,
        minThreshold: Number(itemForm.minThreshold),
        optimalStock: Number(itemForm.optimalStock),
        notes: itemForm.notes,
      });
      setToastMessage(`Inventory item "${itemForm.itemName}" recorded successfully.`);
      setIsAddItemModalOpen(false);
      setItemForm({
        itemName: '',
        category: 'Fuel',
        currentStock: 100,
        unit: 'L',
        minThreshold: 200,
        optimalStock: 500,
        notes: '',
      });
      await loadStationData(selectedStationId);
    } catch (err: any) {
      alert(err.message || 'Failed to save inventory item');
    } finally {
      setIsSavingItem(false);
    }
  };

  // Open Restock Modal
  const handleOpenRestock = (item: InventoryItem) => {
    setSelectedRestockItem(item);
    const minThresh = item.minThreshold ?? 50;
    const optimal = item.optimalStock ?? minThresh * 2;
    const deficit = Math.max(optimal - item.currentStock, minThresh);
    setRestockForm({
      requestedQuantity: deficit > 0 ? deficit : 100,
      priority: item.currentStock < minThresh * 0.5 ? 'CRITICAL' : 'HIGH',
      notes: `Automatic restocking request initiated by Station Manager for ${item.itemName} at ${currentStation?.name}.`,
    });
    setIsRestockModalOpen(true);
  };

  // Submit Restock Request to ADMIN
  const handleSubmitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestockItem) return;
    try {
      setIsSubmittingRestock(true);
      await requestItemRestock(selectedRestockItem.id, {
        requestedQuantity: Number(restockForm.requestedQuantity),
        priority: restockForm.priority,
        notes: restockForm.notes,
      });
      setToastMessage(
        `Restock request submitted for ${selectedRestockItem.itemName}. Global Alert sent to Mission Control Admin!`
      );
      setIsRestockModalOpen(false);
      setSelectedRestockItem(null);
      await loadStationData(selectedStationId);
    } catch (err: any) {
      alert(err.message || 'Failed to submit restock request');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Filtered inventory
  const filteredInventory = inventory.filter((item) => {
    const matchSearch =
      item.itemName.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.category.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(inventorySearch.toLowerCase()));
    const matchCat = categoryFilter === 'ALL' || item.category.toUpperCase() === categoryFilter.toUpperCase();
    return matchSearch && matchCat;
  });

  const categories = ['ALL', 'Fuel', 'Food', 'Medical', 'Equipment', 'Science', 'Vehicle'];

  if (isLoading && !currentStation) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs font-semibold">Connecting to Station Operational Telemetry...</div>
        </div>
      </div>
    );
  }

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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {currentStation?.name || 'Polar Station'} Command Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Operational
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manager: <span className="font-semibold text-slate-700">{currentUser?.name || (currentStation as any)?.manager?.name || 'Dr. Rajesh Nair'}</span>
            </p>
          </div>
        </div>

        {/* Right side controls: KEEP ONLY: + Add Inventory Item */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Inventory Item</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Weather Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Station Weather</span>
            <CloudSnow className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {currentStation?.weather?.tempCelsius ?? -19}°C
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{currentStation?.weather?.condition || 'Clear Snow'}</span>
            <span className="font-mono text-slate-400">Wind: {currentStation?.weather?.windSpeed || '18 km/h'}</span>
          </div>
        </div>

        {/* Personnel Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Station Personnel</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {currentStation?.personnelCount || 12} / {currentStation?.capacity || 25}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Occupancy</span>
            <span className="font-semibold text-emerald-600">
              {Math.round(((currentStation?.personnelCount || 12) / (currentStation?.capacity || 25)) * 100)}%
            </span>
          </div>
        </div>

        {/* Inventory Items Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Inventory Items</span>
            <Boxes className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">{inventory.length}</div>
          <div className="text-[11px] mt-1 flex items-center justify-between">
            {lowItems.length > 0 ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {lowItems.length} Shortage
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">0 Shortage</span>
            )}
          </div>
        </div>

        {/* Restock Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Restock</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">{restockRequests.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{restockRequests.length} Active Requests</span>
            <span className="font-semibold text-indigo-600">
              {restockRequests.filter((r) => r.status === 'CARGO_CREATED' || r.status === 'IN_TRANSIT').length} In Transit
            </span>
          </div>
        </div>

        {/* Station Expeditions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Active Expeditions</span>
            <Compass className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{stationExpeditions.length} Field Operations</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Communications Status</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Optimal
            </span>
          </div>
        </div>
      </div>

      {/* AI Shortage Alert (Simplified, compact, with View Items and Request Restock) */}
      {lowItems.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm font-bold text-amber-900">
              AI Shortage Detected: {lowItems.length} {lowItems.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
            >
              View Items
            </button>
            <button
              onClick={() => {
                if (lowItems[0]) handleOpenRestock(lowItems[0]);
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
            >
              Request Restock
            </button>
          </div>
        </div>
      )}


      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-6">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-2.5 transition border-b-2 ${
            activeTab === 'OVERVIEW'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Station Overview & Systems
        </button>
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'INVENTORY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Station Inventory</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
            {inventory.length}
          </span>
          {lowItems.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-700 rounded-full text-[10px]">
              {lowItems.length} alert
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('RESTOCK')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'RESTOCK'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Restock Requests & Cargo</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
            {restockRequests.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('EXPEDITIONS')}
          className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'EXPEDITIONS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Expedition Operations</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-[10px]">
            {stationExpeditions.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Station Infrastructure & Resources */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Station Critical Reserves Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['Fuel', 'Food', 'Medical'].map((cat) => {
                  const itemsInCat = inventory.filter((i) => i.category.toLowerCase() === cat.toLowerCase());
                  const totalStock = itemsInCat.reduce((sum, i) => sum + i.currentStock, 0);
                  const totalMin = itemsInCat.reduce((sum, i) => sum + (i.minThreshold || 100), 0);
                  const isCatLow = itemsInCat.some((i) => i.currentStock <= (i.minThreshold || 50));
                  return (
                    <div
                      key={cat}
                      className={`p-3.5 rounded-xl border ${
                        isCatLow ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>{cat} Reserves</span>
                        {isCatLow ? (
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                            LOW
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                            GOOD
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-black text-slate-900">{totalStock.toLocaleString()} units</div>
                      <div className="text-[11px] text-slate-400 mt-1">Min Safe Buffer: {totalMin} units</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Expeditions Linked to Station (Simplified) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Active Expeditions</h3>
                <span className="text-xs text-slate-400 font-semibold">{stationExpeditions.length} active</span>
              </div>

              {stationExpeditions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  No active field expeditions currently associated with {currentStation?.name}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stationExpeditions.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{exp.name || exp.title}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {exp.missionObjective || exp.type || 'Polar research and field operations'}
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate && onNavigate(`/expeditions/${exp.id}`)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0 cursor-pointer"
                      >
                        <span>View Expedition</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Rail: Station Facilities & Communications */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Station Facility Status</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-700">HF/VHF Radio Link</span>
                  </div>
                  <span className="text-emerald-600 font-bold">100% ONLINE</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-700">Power Microgrid / Genset</span>
                  </div>
                  <span className="text-emerald-600 font-bold">Nominal (94 kW)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-slate-700">Habitat Heat Loop</span>
                  </div>
                  <span className="text-slate-800 font-bold">+18.5°C Ambient</span>
                </div>
              </div>
            </div>

            {/* Recent Station Restock Requests */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Restock Requests</h3>
                <button
                  onClick={() => setActiveTab('RESTOCK')}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  View All
                </button>
              </div>

              {restockRequests.length === 0 ? (
                <div className="text-center p-4 text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No restock requests currently open.
                </div>
              ) : (
                <div className="space-y-2">
                  {restockRequests.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {req.item?.itemName || 'Item'} ({req.requestedQuantity} {req.item?.unit || 'units'})
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Status: <span className="font-semibold text-indigo-600">{req.status}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {req.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY MANAGEMENT */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item, category, SKU..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      categoryFilter === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsAddItemModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item Name / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Thresholds (Min / Safe)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No inventory records match the search filter.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const status = (item.status || 'NORMAL').toUpperCase();
                    const isLow = status === 'LOW' || item.currentStock <= (item.minThreshold || 50);
                    const isCritical = status === 'CRITICAL' || item.currentStock < (item.minThreshold || 50) * 0.5;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.sku || `SKU-${item.id.slice(0, 6)}`}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-900">
                            {item.currentStock.toLocaleString()}
                          </span>{' '}
                          <span className="text-slate-500 font-mono text-[11px]">{item.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          <span className="font-semibold text-rose-600">Min: {item.minThreshold ?? 50}</span>
                          <span className="text-slate-300 mx-1.5">•</span>
                          <span className="text-slate-500">Optimal: {item.optimalStock ?? 200}</span>
                        </td>
                        <td className="py-3 px-4">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              CRITICAL
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              LOW
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              NORMAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenRestock(item)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-2xs ${
                              isLow || isCritical
                                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
                                : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            Request Restock
                          </button>
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

      {/* TAB 3: RESTOCK REQUESTS & CARGO FULFILLMENT */}
      {activeTab === 'RESTOCK' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Restock Requests & Cargo Fulfillment</h3>
            <button
              onClick={() => {
                if (inventory[0]) handleOpenRestock(inventory[0]);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Restock Request</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {restockRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No restock requests generated yet for {currentStation?.name}.
                    </td>
                  </tr>
                ) : (
                  restockRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {req.item?.itemName || 'Item'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-semibold text-blue-600">{req.requestedQuantity}</span>{' '}
                        {req.item?.unit || 'units'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            req.priority === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800'
                              : req.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            req.status === 'FULFILLED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'CARGO_CREATED' || req.status === 'IN_TRANSIT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status === 'FULFILLED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {req.status === 'CARGO_CREATED' && <Truck className="w-3 h-3 text-blue-600" />}
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXPEDITION OPERATIONS */}
      {activeTab === 'EXPEDITIONS' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Expedition Operations</h3>
              <span className="text-xs text-slate-500 font-medium">Operating from {currentStation?.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stationExpeditions.map((exp) => (
                <div key={exp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{exp.name || exp.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {exp.missionObjective || exp.type || 'Field exploration and sampling'}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      {exp.status || 'Active'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span>GPS Telemetry:</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Operational
                      </span>
                    </div>

                    <button
                      onClick={() => onNavigate && onNavigate(`/expeditions/${exp.id}`)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      <span>View Expedition</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* MODAL 1: ADD INVENTORY ITEM */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Add Station Inventory Item
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter new asset or consumable to be managed at {currentStation?.name}.
            </p>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Polar Diesel JP-8, Freeze-Dried Ration Pouch"
                  value={itemForm.itemName}
                  onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                  >
                    <option value="Fuel">Fuel</option>
                    <option value="Food">Food / Rations</option>
                    <option value="Medical">Medical Supplies</option>
                    <option value="Water">Potable Water</option>
                    <option value="Research">Research Supplies</option>
                    <option value="Spare Parts">Spare Parts</option>
                    <option value="Batteries">Batteries & Power</option>
                    <option value="Safety">Safety & Survival</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    placeholder="L, kg, kits, units"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Current Stock</label>
                  <input
                    type="number"
                    required
                    value={itemForm.currentStock}
                    onChange={(e) => setItemForm({ ...itemForm, currentStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min Threshold</label>
                  <input
                    type="number"
                    required
                    value={itemForm.minThreshold}
                    onChange={(e) => setItemForm({ ...itemForm, minThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Optimal Target</label>
                  <input
                    type="number"
                    required
                    value={itemForm.optimalStock}
                    onChange={(e) => setItemForm({ ...itemForm, optimalStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Operational Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Storage container, shelf ID, special handling"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {isSavingItem ? 'Saving...' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST RESTOCK */}
      {isRestockModalOpen && selectedRestockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Initiate Restock Request</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Submit replenishment requirement for <span className="font-bold text-slate-800">{selectedRestockItem.itemName}</span> to Mission Control Admin.
            </p>

            <form onSubmit={handleSubmitRestock} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Current Stock:</span>
                  <span className="font-extrabold text-slate-900">
                    {selectedRestockItem.currentStock} {selectedRestockItem.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Safety Min Threshold:</span>
                  <span className="font-extrabold text-rose-600">
                    {selectedRestockItem.minThreshold ?? 50} {selectedRestockItem.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Requested Quantity ({selectedRestockItem.unit})
                </label>
                <input
                  type="number"
                  required
                  value={restockForm.requestedQuantity}
                  onChange={(e) => setRestockForm({ ...restockForm, requestedQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Priority Level</label>
                <select
                  value={restockForm.priority}
                  onChange={(e) => setRestockForm({ ...restockForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                >
                  <option value="LOW">Low (Routine Staging)</option>
                  <option value="MEDIUM">Medium (Seasonal Resupply)</option>
                  <option value="HIGH">High (Stock Depleting Rapidly)</option>
                  <option value="CRITICAL">Critical (Life Safety / Mission Impact)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes for Admin</label>
                <textarea
                  rows={2}
                  value={restockForm.notes}
                  onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {isSubmittingRestock ? 'Submitting...' : 'Send Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

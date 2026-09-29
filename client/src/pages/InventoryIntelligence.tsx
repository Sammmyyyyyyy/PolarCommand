import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  ShieldAlert,
  Send,
  Truck,
  Check,
  PackageCheck,
  TrendingDown,
  Info,
} from 'lucide-react';
import { InventoryItem } from '../types';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import {
  getAllPolarStations,
  StationFullRecord,
  StationInventoryItem,
  StationDelivery,
  sendStationManagerAlert,
} from '../services/stationService';
import { Modal } from '../components/common/Modal';
import { requestInventoryRestock } from '../services/api';

interface InventoryIntelligenceProps {
  inventoryList?: InventoryItem[];
  onNavigate?: (path: string) => void;
  onRefreshData?: () => void;
}

export const InventoryIntelligence: React.FC<InventoryIntelligenceProps> = ({
  inventoryList = [],
  onNavigate,
  onRefreshData,
}) => {
  const { currentExpedition, triggerRefresh } = useExpedition();
  const { currentUser, isStationManager, isAdmin, isLogisticsCommander, canEditOperationalData } = useAuth();

  // All polar stations state
  const [stations, setStations] = useState<StationFullRecord[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);

  // Selected station ID (URL param -> localStorage -> default 'bharati')
  const [selectedStationId, setSelectedStationId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stParam = urlParams.get('station');
    return (
      stParam ||
      localStorage.getItem('polar_active_station') ||
      'bharati'
    );
  });

  // Search and Category/Status filters (scoped strictly to selected station)
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // "Alert Station Manager" Workflow Modal State (Admin / Logistics Coordinator)
  const [alertTargetItem, setAlertTargetItem] = useState<StationInventoryItem | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [sentAlertItemIds, setSentAlertItemIds] = useState<Set<string>>(new Set());
  const [alertSuccessBanner, setAlertSuccessBanner] = useState<string | null>(null);

  // "Add Requirement" Workflow Modal State (Station Manager role)
  const [requirementTargetItem, setRequirementTargetItem] = useState<StationInventoryItem | null>(null);
  const [requirementQty, setRequirementQty] = useState<number>(10);
  const [requirementPriority, setRequirementPriority] = useState<string>('HIGH');
  const [requirementNotes, setRequirementNotes] = useState<string>('');
  const [isSubmittingRequirement, setIsSubmittingRequirement] = useState(false);
  const [requirementSuccessBanner, setRequirementSuccessBanner] = useState<string | null>(null);

  // Load all stations with rich canonical inventory and manager details
  useEffect(() => {
    let isMounted = true;
    async function loadStations() {
      setIsLoadingStations(true);
      try {
        const data = await getAllPolarStations();
        if (isMounted) {
          setStations(data);
        }
      } catch (err) {
        console.error('Failed to load stations for inventory:', err);
      } finally {
        if (isMounted) setIsLoadingStations(false);
      }
    }
    loadStations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fixed assigned station context for Station Manager role (mandatory RBAC lock)
  const assignedStationId = useMemo(() => {
    if (!isStationManager || !currentUser) return null;
    if (currentUser.stationId) {
      const match = stations.find(
        (s) =>
          s.id.toLowerCase() === currentUser.stationId?.toLowerCase() ||
          s.code.toLowerCase() === currentUser.stationId?.toLowerCase()
      );
      if (match) return match.id;
    }
    const emailLower = (currentUser.email || '').toLowerCase();
    const nameLower = (currentUser.name || '').toLowerCase();
    if (emailLower.includes('maitri') || nameLower.includes('sen')) {
      const m = stations.find((s) => s.code.toLowerCase() === 'maitri');
      if (m) return m.id;
    }
    const b = stations.find((s) => s.code.toLowerCase() === 'bharati');
    return b ? b.id : 'bharati';
  }, [isStationManager, currentUser, stations]);

  // Enforce Station Manager cannot switch stations and is locked to assigned station
  useEffect(() => {
    if (isStationManager && assignedStationId && selectedStationId !== assignedStationId) {
      setSelectedStationId(assignedStationId);
    }
  }, [isStationManager, assignedStationId, selectedStationId]);

  // Sync station from URL query params (only for authorized non-Station Manager roles)
  useEffect(() => {
    if (isStationManager) return;
    const urlParams = new URLSearchParams(window.location.search);
    const stParam = urlParams.get('station');
    if (stParam && stations.length > 0) {
      const match = stations.find(
        (st) =>
          st.id.toLowerCase() === stParam.toLowerCase() ||
          st.code.toLowerCase() === stParam.toLowerCase() ||
          st.name.toLowerCase().includes(stParam.toLowerCase())
      );
      if (match && match.id !== selectedStationId) {
        setSelectedStationId(match.id);
        localStorage.setItem('polar_active_station', match.id);
      }
    }
  }, [stations, selectedStationId, isStationManager]);

  // Handle switching stations (blocked for Station Manager)
  const handleSelectStation = (stationId: string) => {
    if (isStationManager) return; // Station Manager cannot switch stations
    setSelectedStationId(stationId);
    localStorage.setItem('polar_active_station', stationId);
    setAlertSuccessBanner(null);
    setRequirementSuccessBanner(null);
    // Update URL query param cleanly without page reload
    const newUrl = `${window.location.pathname}?station=${encodeURIComponent(stationId)}`;
    window.history.replaceState(null, '', newUrl);
  };

  // Currently selected station record
  const currentStation = useMemo(() => {
    if (stations.length === 0) return null;
    const sId = selectedStationId.toLowerCase().replace(/^st-/, '');
    return (
      stations.find(
        (s) =>
          s.id.toLowerCase() === selectedStationId.toLowerCase() ||
          s.id.toLowerCase() === `st-${sId}` ||
          s.code.toLowerCase() === sId ||
          s.name.toLowerCase().includes(sId)
      ) || stations[0]
    );
  }, [stations, selectedStationId]);

  // Filtered inventory items strictly belonging to currentStation
  const filteredInventory = useMemo(() => {
    if (!currentStation) return [];
    return currentStation.inventoryItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStatus =
        selectedStatusFilter === 'All' ||
        item.status.toUpperCase() === selectedStatusFilter.toUpperCase();

      const matchesSearch =
        search.trim() === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [currentStation, selectedCategory, selectedStatusFilter, search]);

  // -------------------------------------------------------------
  // DATA-DRIVEN STATION OVERVIEW METRICS (Strictly selected station)
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    if (!currentStation) {
      return {
        totalItems: 0,
        belowSafety: 0,
        criticalItems: 0,
        upcomingDeliveries: 0,
        daysOfCover: 'N/A',
        minDays: 0,
        avgDays: 0,
        pendingReplenishment: 0,
        readiness: 100,
      };
    }

    const items = currentStation.inventoryItems;
    const totalItems = items.length;

    const belowSafety = items.filter((i) => i.currentStock < i.safetyMinimum).length;
    const criticalItems = items.filter(
      (i) => i.status === 'CRITICAL' || i.currentStock === 0
    ).length;

    const upcomingDeliveries = currentStation.deliveries.length;

    // Calculate Days of Supply (cover)
    const validDays = items
      .map((i) => i.daysOfSupply)
      .filter((d) => typeof d === 'number' && !isNaN(d) && d >= 0);

    const minDays = validDays.length > 0 ? Math.min(...validDays) : 0;
    const avgDays =
      validDays.length > 0
        ? Math.round(validDays.reduce((a, b) => a + b, 0) / validDays.length)
        : 0;

    const daysOfCover = validDays.length > 0 ? `${minDays}d (Min) • ${avgDays}d (Avg)` : 'N/A';

    // Pending replenishment: items marked LOW or CRITICAL
    const pendingReplenishment = items.filter(
      (i) => i.status === 'LOW' || i.status === 'CRITICAL'
    ).length;

    return {
      totalItems,
      belowSafety,
      criticalItems,
      upcomingDeliveries,
      daysOfCover,
      minDays,
      avgDays,
      pendingReplenishment,
      readiness: currentStation.readinessScore || 92,
    };
  }, [currentStation]);

  // Open "Alert Station Manager" Confirmation Panel
  const handleOpenAlertModal = (item: StationInventoryItem) => {
    setAlertTargetItem(item);
    setAlertMessage(
      `Inventory level for ${item.name} has fallen below the safety limit (${item.currentStock} ${item.unit} remaining, safety limit is ${item.safetyMinimum} ${item.unit}). Days of supply is ${item.daysOfSupply} days. Please review and initiate replenishment requirement with Logistics Command if required.`
    );
  };

  // Submit Alert to Station Manager
  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStation || !alertTargetItem) return;

    try {
      setIsSendingAlert(true);
      await sendStationManagerAlert({
        station: currentStation,
        item: alertTargetItem,
        message: alertMessage,
      });

      // Mark this item as alerted in session
      setSentAlertItemIds((prev) => new Set(prev).add(alertTargetItem.id));
      setAlertSuccessBanner('✓ Alert sent to Station Manager');
      setAlertTargetItem(null);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('[Alert Station Manager Error]', err);
      alert(err.message || 'Failed to dispatch alert to station manager');
    } finally {
      setIsSendingAlert(false);
    }
  };

  // Open "Add Requirement" modal for Station Manager
  const handleOpenRequirementModal = (item: StationInventoryItem) => {
    const deficit = Math.max(1, item.safetyMinimum - item.currentStock);
    setRequirementTargetItem(item);
    setRequirementQty(deficit > 0 ? deficit : 10);
    setRequirementPriority(item.status === 'CRITICAL' ? 'CRITICAL' : 'HIGH');
    setRequirementNotes(`Operational shortage at ${currentStation?.name || 'station'}. Replenishment requested to restore minimum safety reserves.`);
  };

  // Submit Requirement to Supply & Logistics Command
  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirementTargetItem || !currentStation) return;

    try {
      setIsSubmittingRequirement(true);
      await requestInventoryRestock(requirementTargetItem.id, {
        requestedQuantity: requirementQty,
        priority: requirementPriority,
        notes: requirementNotes,
        stationId: currentStation.id,
        itemName: requirementTargetItem.name,
        category: requirementTargetItem.category,
        currentStock: requirementTargetItem.currentStock,
        safetyMinimum: requirementTargetItem.safetyMinimum,
        unit: requirementTargetItem.unit,
      } as any);

      setSentAlertItemIds((prev) => new Set(prev).add(requirementTargetItem.id));
      setRequirementSuccessBanner(
        `✓ Requirement logged for ${requirementTargetItem.name} (${requirementQty} ${requirementTargetItem.unit}) and routed to Supply & Logistics Command.`
      );
      setRequirementTargetItem(null);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('[Add Requirement Error]', err);
      alert(err.message || 'Failed to submit requirement to Supply & Logistics');
    } finally {
      setIsSubmittingRequirement(false);
    }
  };

  const categories = [
    'All',
    'Medicine',
    'Food',
    'Fuel',
    'Water',
    'Spare Parts',
    'Scientific',
    'Communication',
    'Safety',
  ];

  const statusFilters = ['All', 'OPTIMAL', 'HEALTHY', 'LOW', 'CRITICAL', 'OUT OF STOCK'];

  if (isLoadingStations && stations.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center space-y-4 font-sans">
        <div className="w-10 h-10 border-3 border-sky-200 border-t-[#0284C7] rounded-full animate-spin mx-auto" />
        <p className="text-xs font-normal text-slate-500">
          Loading station inventory and supply reserves...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* ------------------------------------------------------------- */}
      {/* PART 2 — INVENTORY HEADER & STATION SELECTOR (CONTEXT FIRST)  */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#0284C7] uppercase tracking-wider mb-1">
              <Boxes className="w-4 h-4" />
              <span>Base Station Inventory Intelligence</span>
            </div>
            {/* Page Title: ~32-36px, font-weight: 600-700 */}
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Inventory Intelligence
            </h1>
            {/* Body / Description Text: font-weight: 400, font-size: 14-15px */}
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Monitor station inventory, stock levels and replenishment.
            </p>
          </div>

          {/* Station Selector (Visible only for Admin / Logistics; Station Manager is automatically scoped) */}
          {!isStationManager && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 min-w-[320px] sm:min-w-[380px] shadow-2xs">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Station Base</span>
                <span className="text-[#0284C7] font-medium">
                  {stations.length} Registered Stations
                </span>
              </div>

              <div className="relative">
                <select
                  value={currentStation?.id || selectedStationId}
                  onChange={(e) => handleSelectStation(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0284C7] cursor-pointer shadow-2xs transition"
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Station Status Context Strip */}
              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200/70 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Status:
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {currentStation?.status || 'Operational'}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] font-normal">
                  Manager:{' '}
                  <span className="font-semibold text-slate-800">
                    {currentStation?.stationManager.name || 'Station Chief'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Banner if Alert Was Sent */}
        {alertSuccessBanner && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{alertSuccessBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setAlertSuccessBanner(null)}
              className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Banner if Requirement Was Logged */}
        {requirementSuccessBanner && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{requirementSuccessBanner}</span>
            </div>
            <div className="flex items-center space-x-3 self-end sm:self-auto">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/logistics')}
                  className="text-emerald-800 font-semibold underline hover:text-emerald-950 cursor-pointer"
                >
                  View in Supply & Logistics →
                </button>
              )}
              <button
                type="button"
                onClick={() => setRequirementSuccessBanner(null)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 12 — COMPACT STATION CONTEXT CARD                        */}
      {/* ------------------------------------------------------------- */}
      {currentStation && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-[#0284C7]" />
              {/* Section title: font-weight: 600 */}
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                {currentStation.name}
              </h2>
              {/* Status badge: font-weight: 500-600 */}
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                🟢 Operational
              </span>
            </div>
            {/* Location / descriptive text: font-weight: 400 */}
            <div className="text-xs text-slate-500 font-normal">
              {currentStation.region} • Polar Capacity: {currentStation.capacity} Personnel
            </div>
            {/* Station Manager row: label 500-600, name 600 */}
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
              <span className="text-slate-400 font-medium uppercase text-[11px]">
                Station Manager:
              </span>
              <span className="font-semibold text-slate-800">
                {currentStation.stationManager.name}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 shrink-0">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">
                Station Readiness
              </span>
              <div className="flex items-center space-x-2 mt-0.5">
                {/* Metric value: 600-700 */}
                <span className="text-2xl font-bold text-slate-900">
                  {metrics.readiness}%
                </span>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                  🟢 Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PART 3 — DATA-DRIVEN STATION OVERVIEW CARDS (6 CARDS)         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. TOTAL INVENTORY ITEMS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Label: 11-13px, font-weight: 500-600 */}
          <span className="text-slate-500 block text-[11px] uppercase font-medium tracking-wider">
            Total Inventory Items
          </span>
          {/* Number: 24-28px, font-weight: 600-700 */}
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {metrics.totalItems} Items
          </span>
          <span className="text-[11px] text-slate-400 font-normal mt-0.5 block truncate">
            {currentStation?.code || 'Base'} Tracked Stock
          </span>
        </div>

        {/* 2. ITEMS BELOW SAFETY LIMIT */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] uppercase font-medium tracking-wider">
            Below Safety Limit
          </span>
          <span
            className={`text-2xl font-bold mt-1 block ${
              metrics.belowSafety > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {metrics.belowSafety} Items
          </span>
          <span className="text-[11px] text-slate-400 font-normal mt-0.5 block truncate">
            {metrics.belowSafety > 0 ? 'Under minimum reserve' : 'All above threshold'}
          </span>
        </div>

        {/* 3. CRITICAL ITEMS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] uppercase font-medium tracking-wider">
            Critical Items
          </span>
          <span
            className={`text-2xl font-bold mt-1 block ${
              metrics.criticalItems > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {metrics.criticalItems} Critical
          </span>
          <span
            className={`text-[11px] font-normal mt-0.5 block truncate ${
              metrics.criticalItems > 0 ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            {metrics.criticalItems > 0 ? 'Requires attention' : 'Nominal safety buffer'}
          </span>
        </div>

        {/* 4. UPCOMING DELIVERIES */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] uppercase font-medium tracking-wider">
            Upcoming Deliveries
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {metrics.upcomingDeliveries} Deliveries
          </span>
          <span className="text-[11px] text-[#0284C7] font-normal mt-0.5 block truncate">
            En-route / scheduled
          </span>
        </div>

        {/* 5. DAYS OF COVER */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] uppercase font-medium tracking-wider">
            Days of Cover
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block truncate">
            {metrics.minDays} Days
          </span>
          <span className="text-[11px] text-slate-400 font-normal mt-0.5 block truncate">
            Min reserve: {metrics.minDays}d
          </span>
        </div>

        {/* 6. PENDING REPLENISHMENT */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-slate-500 block text-[11px] uppercase font-medium tracking-wider">
            Pending Replenishment
          </span>
          <span
            className={`text-2xl font-bold mt-1 block ${
              metrics.pendingReplenishment > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {metrics.pendingReplenishment} Requests
          </span>
          <span className="text-[11px] text-slate-400 font-normal mt-0.5 block truncate">
            Low / Critical items
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 11 — SEARCH AND FILTER CONTROLS                          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${currentStation?.name || 'station'} inventory...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0284C7] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 font-medium'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PART 4 — INVENTORY TABLE (CLEAN, REFINED TYPOGRAPHY)          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            {/* Section title: font-weight: 600 */}
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 uppercase tracking-wider">
              {currentStation?.name} Stock Manifest
            </h2>
            {/* Body / description: font-weight: 400 */}
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Deterministic consumption, days of supply, and separate inbound shipments for{' '}
              <span className="font-medium text-slate-700">{currentStation?.name}</span>.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-[#0284C7] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
            {filteredInventory.length} Items Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table headers: font-size: 11-12px, font-weight: 500-600, letter-spacing: 0.04-0.06em */}
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 text-[11px] font-medium uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-medium">Item Name</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Current Stock</th>
                <th className="py-3 px-4 font-medium">Days of Supply</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Upcoming Delivery</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                    <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No inventory records match the current filter in {currentStation?.name}.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isCritical = item.status === 'CRITICAL';
                  const isLow = item.status === 'LOW';
                  const isAlerted = sentAlertItemIds.has(item.id);

                  // Days of supply display
                  const daysDisplay =
                    typeof item.daysOfSupply === 'number' && !isNaN(item.daysOfSupply)
                      ? `${item.daysOfSupply} days`
                      : 'N/A';

                  // Upcoming delivery separate display
                  const delivery = item.upcomingDelivery;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-sky-50/40 transition ${
                        isCritical ? 'bg-rose-50/30' : isLow ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* ITEM NAME: font-weight: 500-600 */}
                      <td className="py-3.5 px-4 text-slate-900 font-semibold">
                        <div>{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          Safety Min: {item.safetyMinimum} {item.unit} • Burn: -
                          {item.dailyConsumption}/{item.unit.split(' ')[0]} / day
                        </div>
                      </td>

                      {/* CATEGORY: font-weight: 500 */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                          {item.category}
                        </span>
                      </td>

                      {/* CURRENT STOCK: font-weight: 500-600 */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 text-xs">
                        <span>
                          {item.currentStock} {item.unit}
                        </span>
                      </td>

                      {/* DAYS OF SUPPLY: font-weight: 500-600, emphasize critical/low */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span
                          className={
                            isCritical
                              ? 'font-semibold text-rose-600'
                              : isLow
                              ? 'font-semibold text-amber-600'
                              : 'font-medium text-slate-700'
                          }
                        >
                          {daysDisplay}
                        </span>
                      </td>

                      {/* STATUS: font-weight: 500-600 */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : item.status === 'OUT OF STOCK'
                              ? 'bg-slate-200 text-slate-800 border border-slate-300'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* UPCOMING DELIVERY */}
                      <td className="py-3.5 px-4 text-xs">
                        {delivery ? (
                          <div className="flex items-center space-x-1.5 text-sky-800 font-medium bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 w-fit">
                            <Truck className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                            <span className="font-semibold">
                              +{delivery.quantity} in {delivery.etaDays}d
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({delivery.vessel})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* ACTIONS: font-weight: 600 for action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        {(isCritical || isLow) && (
                          <>
                            {isStationManager ? (
                              <button
                                type="button"
                                disabled={isAlerted}
                                onClick={() => handleOpenRequirementModal(item)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1 ml-auto cursor-pointer ${
                                  isAlerted
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default opacity-90'
                                    : 'bg-[#0284C7] hover:bg-[#0369a1] text-white shadow-xs'
                                }`}
                              >
                                {isAlerted ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Requirement Added</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Requirement</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isAlerted}
                                onClick={() => handleOpenAlertModal(item)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1 ml-auto cursor-pointer ${
                                  isAlerted
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default opacity-90'
                                    : isCritical
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                }`}
                              >
                                {isAlerted ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Alert Dispatched</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Alert Station Manager</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
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

      {/* ------------------------------------------------------------- */}
      {/* PART 5 & 14 — UPCOMING DELIVERIES & REPLENISHMENT TIMELINE    */}
      {/* ------------------------------------------------------------- */}
      {currentStation && currentStation.deliveries && currentStation.deliveries.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#0284C7]">
                Logistics & Supply Ingress
              </div>
              {/* Section title: font-weight: 600 */}
              <h3 className="text-lg font-semibold text-slate-900 mt-0.5 tracking-tight">
                Upcoming Replenishment Timeline
              </h3>
              {/* Body / descriptive text: font-weight: 400 */}
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Incoming shipments en-route to{' '}
                <span className="font-medium text-slate-700">{currentStation.name}</span>. Inbound
                stock is tracked separately and NOT counted as current stock until delivery is
                completed.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              {currentStation.deliveries.length} Shipments In Transit
            </span>
          </div>

          {/* Timeline visualization */}
          <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-sky-200">
            <div className="text-[11px] font-medium text-slate-400 uppercase -ml-4 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] ring-4 ring-sky-100" />
              <span>Today (Stock Status Baseline)</span>
            </div>

            {currentStation.deliveries.map((del) => (
              <div
                key={del.id}
                className="relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/80 gap-3 transition"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                  <div>
                    {/* Item title: font-weight: 600 */}
                    <div className="font-semibold text-slate-900 text-xs">{del.itemName}</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Carrier / Vessel:{' '}
                      <span className="font-medium text-slate-700">{del.vessel}</span> • Category:{' '}
                      {del.category}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto text-xs">
                  <span className="font-mono font-medium text-sky-800 bg-sky-100/70 px-2.5 py-1 rounded-lg border border-sky-200">
                    +{del.quantity} {del.unit}
                  </span>
                  <span className="text-slate-600 font-normal text-xs">
                    ETA: <span className="font-semibold text-slate-800">{del.etaDays} days</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {del.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PART 6 — "ALERT STATION MANAGER" ACTION MODAL                 */}
      {/* ------------------------------------------------------------- */}
      {alertTargetItem && currentStation && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                  Critical Inventory Protocol
                </span>
                <h3 className="text-xl font-semibold text-slate-900 mt-1 tracking-tight">
                  Alert Station Manager
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Official operational alert to Station Manager for review & replenishment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAlertTargetItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Context Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Station:
                  </span>
                  <div className="font-semibold text-slate-900">{currentStation.name}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Station Manager:
                  </span>
                  <div className="font-semibold text-slate-900">
                    {currentStation.stationManager.name}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Item:
                  </span>
                  <div className="font-semibold text-slate-900 truncate">
                    {alertTargetItem.name}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Current Stock:
                  </span>
                  <div className="font-mono font-semibold text-rose-600">
                    {alertTargetItem.currentStock} {alertTargetItem.unit}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    Safety Minimum:
                  </span>
                  <div className="font-mono font-medium text-slate-800">
                    {alertTargetItem.safetyMinimum} {alertTargetItem.unit}
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Notice */}
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs text-sky-900 leading-relaxed font-normal">
              <span className="font-semibold">Operational Workflow:</span> The Mission Control Admin
              alerts the Station Manager. The Station Manager verifies physical stock and initiates
              the resupply requirement with the Logistics Coordinator.
            </div>

            {/* Message Area */}
            <form onSubmit={handleSendAlert} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Alert Message to Station Manager
                </label>
                <textarea
                  rows={4}
                  required
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAlertTargetItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingAlert}
                  className="px-5 py-2 bg-[#0284C7] hover:bg-sky-700 text-white font-semibold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingAlert ? 'Dispatching...' : 'Send Alert'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* "ADD REQUIREMENT" MODAL (FOR STATION MANAGER)                */}
      {/* ------------------------------------------------------------- */}
      {requirementTargetItem && currentStation && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                  Station Replenishment Protocol
                </span>
                <h3 className="text-xl font-semibold text-slate-900 mt-1 tracking-tight">
                  Add Supply Requirement
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Initiate an official supply requirement for {currentStation.name} with Supply & Logistics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequirementTargetItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Context Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Station:</span>
                  <div className="font-semibold text-slate-900">{currentStation.name}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Station Manager:</span>
                  <div className="font-semibold text-slate-900">
                    {currentStation.stationManager.name || currentUser?.name}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Item:</span>
                  <div className="font-semibold text-slate-900 truncate">{requirementTargetItem.name}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Current Stock:</span>
                  <div className="font-mono font-semibold text-rose-600">
                    {requirementTargetItem.currentStock} {requirementTargetItem.unit}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Safety Minimum:</span>
                  <div className="font-mono font-medium text-slate-800">
                    {requirementTargetItem.safetyMinimum} {requirementTargetItem.unit}
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddRequirement} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Requested Quantity ({requirementTargetItem.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requirementQty}
                    onChange={(e) => setRequirementQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Operational Priority
                  </label>
                  <select
                    value={requirementPriority}
                    onChange={(e) => setRequirementPriority(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition cursor-pointer"
                  >
                    <option value="CRITICAL">CRITICAL (Immediate)</option>
                    <option value="HIGH">HIGH (Standard)</option>
                    <option value="NORMAL">NORMAL (Scheduled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Justification / Operational Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={requirementNotes}
                  onChange={(e) => setRequirementNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRequirementTargetItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequirement}
                  className="px-5 py-2 bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmittingRequirement ? 'Submitting...' : 'Submit Requirement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

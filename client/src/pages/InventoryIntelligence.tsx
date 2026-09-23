import React, { useState } from 'react';
import {
  Boxes,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Filter,
  BarChart2,
  Sparkles,
  ArrowRight,
  Plus,
  ArrowLeftRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { InventoryItem } from '../types';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { createInventory, reallocateInventory } from '../services/api';
import { Modal } from '../components/common/Modal';

interface InventoryIntelligenceProps {
  inventoryList: InventoryItem[];
  onNavigate?: (path: string) => void;
  onRefreshData?: () => void;
}

export const InventoryIntelligence: React.FC<InventoryIntelligenceProps> = ({
  inventoryList,
  onNavigate,
  onRefreshData,
}) => {
  const { currentExpeditionId, currentExpedition, dashboard, triggerRefresh } = useExpedition();
  const { canEditOperationalData } = useAuth();

  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Item Form
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'Medicine',
    stationId: 'bharati',
    currentStock: 250,
    unit: 'units',
    dailyUsage: 10,
    safetyThresholdDays: 14,
  });

  // Reallocate Form
  const [reallocateForm, setReallocateForm] = useState({
    fromStationId: 'maitri',
    toStationId: 'bharati',
    category: 'Medicine',
    quantity: 150,
    notes: 'Emergency operational rebalance via traverse convoy',
  });

  // Available stations list
  const availableStations = dashboard?.stationsSummary && dashboard.stationsSummary.length > 0
    ? dashboard.stationsSummary
    : [
        { id: 'bharati', name: 'Bharati Station' },
        { id: 'maitri', name: 'Maitri Station' },
      ];

  const categories = ['All', 'Medicine', 'Food', 'Fuel', 'Spares', 'Water', 'Scientific'];

  const filteredItems = inventoryList.filter((item) => {
    const matchesStation =
      selectedStation === 'all' ||
      item.stationId.toLowerCase() === selectedStation.toLowerCase() ||
      (item.station && item.station.id.toLowerCase() === selectedStation.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesStation && matchesCategory;
  });

  const itemsAtRiskCount = filteredItems.filter((i) => {
    const daily = i.dailyUsage > 0 ? i.dailyUsage : 1;
    return i.currentStock / daily <= i.safetyThresholdDays;
  }).length;

  const totalCategories = new Set(filteredItems.map((i) => i.category)).size;

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpeditionId) return;
    try {
      setIsSubmitting(true);
      await createInventory(currentExpeditionId, {
        name: addForm.name,
        category: addForm.category,
        stationId: addForm.stationId,
        currentStock: Number(addForm.currentStock),
        unit: addForm.unit,
        dailyUsage: Number(addForm.dailyUsage),
        safetyThresholdDays: Number(addForm.safetyThresholdDays),
      });
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        category: 'Medicine',
        stationId: availableStations[0]?.id || 'bharati',
        currentStock: 250,
        unit: 'units',
        dailyUsage: 10,
        safetyThresholdDays: 14,
      });
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to add inventory item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReallocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpeditionId) return;
    try {
      setIsSubmitting(true);
      await reallocateInventory(currentExpeditionId, {
        fromStationId: reallocateForm.fromStationId,
        toStationId: reallocateForm.toStationId,
        category: reallocateForm.category,
        quantity: Number(reallocateForm.quantity),
        notes: reallocateForm.notes,
      });
      setIsReallocateModalOpen(false);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      alert('Stock reallocated successfully! Safety days and risk index recalculated.');
    } catch (err: any) {
      alert(err.message || 'Failed to reallocate stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Depletion projection chart data for active selection
  const highlightedItem = filteredItems.find((i) => i.category === 'Medicine') || filteredItems[0];
  const stock0 = highlightedItem ? highlightedItem.currentStock : 200;
  const usage = highlightedItem ? (highlightedItem.dailyUsage || 10) : 10;
  const threshold = highlightedItem ? highlightedItem.safetyThresholdDays * usage : 120;

  const depletionData = [
    { day: 'Day 0', stock: stock0, threshold },
    { day: 'Day 3', stock: Math.max(0, stock0 - usage * 3), threshold },
    { day: 'Day 6', stock: Math.max(0, stock0 - usage * 6), threshold },
    { day: 'Day 9', stock: Math.max(0, stock0 - usage * 9), threshold },
    { day: 'Day 12', stock: Math.max(0, stock0 - usage * 12), threshold },
    { day: 'Day 15 (Arrival)', stock: stock0 + 150, threshold },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Station Filters matching Screen 5 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Inventory Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 uppercase font-mono">
              Station Reserves
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic daily consumption models, stockout projections, and safe replenishment windows for{' '}
            <strong className="text-slate-800">{currentExpedition?.code || 'Active Expedition'}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {canEditOperationalData && (
            <>
              <button
                onClick={() => setIsReallocateModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Reallocate Stock</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Station Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Station:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setSelectedStation('all')}
              className={`px-3 py-1 rounded-md transition ${
                selectedStation === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Bases
            </button>
            {availableStations.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStation(st.id)}
                className={`px-3 py-1 rounded-md transition ${
                  selectedStation.toLowerCase() === st.id.toLowerCase()
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Tracked Items</span>
          <span className="text-2xl font-black text-slate-900 mt-0.5 block">{filteredItems.length}</span>
          <span className="text-[11px] text-slate-500 font-medium">Across {totalCategories} categories</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Items Below Safety Limit</span>
          <span className={`text-2xl font-black mt-0.5 block ${itemsAtRiskCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {itemsAtRiskCount}
          </span>
          <span className="text-[11px] text-rose-600 font-semibold">
            {itemsAtRiskCount > 0 ? 'Requires Replenishment / Rebalance' : 'All Reserves Healthy'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Reserve Focus</span>
          <span className="text-base font-extrabold text-slate-900 mt-1 block truncate">
            {highlightedItem ? highlightedItem.name : 'Nominal'}
          </span>
          <span className="text-[11px] text-sky-700 font-semibold">
            {highlightedItem
              ? `${Math.floor(highlightedItem.currentStock / (highlightedItem.dailyUsage || 1))} days remaining`
              : 'Sufficient'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Base Readiness Score</span>
          <span className="text-2xl font-black text-emerald-600 mt-0.5 block">
            {dashboard?.kpi.inventoryReadiness ?? 94}%
          </span>
          <span className="text-[11px] text-slate-500">Autonomous burn rate monitored</span>
        </div>
      </div>

      {/* Main Grid: Inventory Table (Left 7) + Depletion Chart (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inventory Items Manifest Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">Station Stock Manifest</h3>
            <span className="text-xs text-slate-400 font-mono">{filteredItems.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3.5">Item Name</th>
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5">Station</th>
                  <th className="py-2.5 px-3.5">Current Stock</th>
                  <th className="py-2.5 px-3.5">Daily Burn</th>
                  <th className="py-2.5 px-3.5">Days of Supply</th>
                  <th className="py-2.5 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No inventory items found. Click "+ Add Item" above to add stock.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const daily = item.dailyUsage > 0 ? item.dailyUsage : 1;
                    const daysRemaining = Math.floor(item.currentStock / daily);
                    const isAtRisk = daysRemaining <= item.safetyThresholdDays;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3.5 font-bold text-slate-900">{item.name}</td>
                        <td className="py-3 px-3.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 font-medium">
                          {item.station?.name || item.stationId}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-500">
                          -{item.dailyUsage}/{item.unit.slice(0, 1) || 'u'}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold">
                          <span className={isAtRisk ? 'text-rose-600' : 'text-slate-800'}>
                            {daysRemaining} days
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              isAtRisk
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isAtRisk ? 'CRITICAL' : 'OPTIMAL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Depletion Projection Chart Card */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Reserve Depletion Projection</h3>
              <p className="text-[11px] text-slate-500">
                15-Day trajectory vs safety threshold for {highlightedItem?.name || 'Selected Item'}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-sky-700">
              {threshold} Safety Min
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={depletionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="stock" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStock)" name="Stock Level" />
                <Area type="monotone" dataKey="threshold" stroke="#e11d48" strokeWidth={2} strokeDasharray="4 4" fill="none" name="Safety Threshold" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">Operational Decision Rule:</span> When projected days remaining
            drop below safety threshold before next supply ETA, the Decision Support Engine triggers automated cross-station
            reallocation from donor stations.
          </div>
        </div>
      </div>

      {/* Add Inventory Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Station Inventory Item"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Winter Grade Jet A-1 Fuel"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Category</label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                <option value="Medicine">Medicine</option>
                <option value="Food">Food</option>
                <option value="Fuel">Fuel</option>
                <option value="Spares">Spares</option>
                <option value="Water">Water</option>
                <option value="Scientific">Scientific</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Station Base</label>
              <select
                value={addForm.stationId}
                onChange={(e) => setAddForm({ ...addForm, stationId: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                {availableStations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Initial Stock</label>
              <input
                type="number"
                required
                min={0}
                value={addForm.currentStock}
                onChange={(e) => setAddForm({ ...addForm, currentStock: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Stock Unit</label>
              <input
                type="text"
                required
                placeholder="e.g. units, liters, kg"
                value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Daily Usage Burn</label>
              <input
                type="number"
                required
                min={0.1}
                step="any"
                value={addForm.dailyUsage}
                onChange={(e) => setAddForm({ ...addForm, dailyUsage: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Safety Threshold (Days)</label>
              <input
                type="number"
                required
                min={1}
                value={addForm.safetyThresholdDays}
                onChange={(e) => setAddForm({ ...addForm, safetyThresholdDays: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Stock Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reallocate Inventory Modal */}
      <Modal
        isOpen={isReallocateModalOpen}
        onClose={() => setIsReallocateModalOpen(false)}
        title="Reallocate Stock Between Bases"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReallocate} className="space-y-4 text-xs">
          <p className="text-slate-500">
            Dispatch an emergency transfer from a donor station with surplus supplies to mitigate risk at a base facing deficit.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">From Station (Donor)</label>
              <select
                value={reallocateForm.fromStationId}
                onChange={(e) => setReallocateForm({ ...reallocateForm, fromStationId: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                {availableStations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">To Station (Recipient)</label>
              <select
                value={reallocateForm.toStationId}
                onChange={(e) => setReallocateForm({ ...reallocateForm, toStationId: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                {availableStations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Category</label>
              <select
                value={reallocateForm.category}
                onChange={(e) => setReallocateForm({ ...reallocateForm, category: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                <option value="Medicine">Medicine</option>
                <option value="Food">Food</option>
                <option value="Fuel">Fuel</option>
                <option value="Spares">Spares</option>
                <option value="Water">Water</option>
                <option value="Scientific">Scientific</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Transfer Quantity</label>
              <input
                type="number"
                required
                min={1}
                value={reallocateForm.quantity}
                onChange={(e) => setReallocateForm({ ...reallocateForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Traverse Convoy / Mission Notes</label>
            <input
              type="text"
              value={reallocateForm.notes}
              onChange={(e) => setReallocateForm({ ...reallocateForm, notes: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsReallocateModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Transferring...' : 'Execute Reallocation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  Ship,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  Zap,
} from 'lucide-react';
import { CargoShipment } from '../types';
import { createCargo, simulateCargoDelay, deleteCargo } from '../services/api';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

interface CargoTrackingProps {
  cargoList: CargoShipment[];
  onSelectCargo: (cargoId: string) => void;
  onRefreshData?: () => void;
}

export const CargoTracking: React.FC<CargoTrackingProps> = ({
  cargoList,
  onSelectCargo,
  onRefreshData,
}) => {
  const { currentExpeditionId, currentExpedition, triggerRefresh } = useExpedition();
  const { canEditOperationalData } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    description: '',
    category: 'Medical',
    weightKg: 450,
    priority: 'HIGH',
    origin: 'NCPOR Goa Depot',
    destination: 'Bharati Station',
    eta: '2027-02-15',
    vesselName: 'MV Polar Queen',
  });

  const categories = [
    'All',
    'Medical',
    'Food',
    'Fuel',
    'Scientific',
    'Spare Parts',
    'Construction',
    'Machinery',
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpeditionId) return;
    try {
      setIsSubmitting(true);
      await createCargo(currentExpeditionId, {
        id: formData.id || undefined,
        description: formData.description,
        category: formData.category,
        weightKg: Number(formData.weightKg),
        priority: formData.priority,
        origin: formData.origin,
        destination: formData.destination,
        eta: formData.eta,
        vesselName: formData.vesselName,
        currentLocation: formData.origin,
        status: 'In Transit',
      });
      setIsModalOpen(false);
      setFormData({
        id: '',
        description: '',
        category: 'Medical',
        weightKg: 450,
        priority: 'HIGH',
        origin: 'NCPOR Goa Depot',
        destination: 'Bharati Station',
        eta: '2027-02-15',
        vesselName: 'MV Polar Queen',
      });
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to create cargo consignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateDelay = async (cargoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await simulateCargoDelay(cargoId, 48);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error simulating delay');
    }
  };

  const handleDeleteCargo = async (cargoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentExpeditionId || !confirm(`Delete cargo shipment ${cargoId}?`)) return;
    try {
      await deleteCargo(currentExpeditionId, cargoId);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete cargo');
    }
  };

  const filteredCargo = cargoList.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.destination.toLowerCase().includes(search.toLowerCase()) ||
      item.origin.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header and Add Cargo Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Cargo Tracking Manifest
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 font-mono">
              {cargoList.length} Shipments
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end maritime and aviation transit tracking for{' '}
            <strong className="text-slate-800">{currentExpedition?.code || 'Active Expedition'}</strong>
          </p>
        </div>

        {canEditOperationalData && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Cargo</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, description, destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cargo List Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Shipment ID</th>
                <th className="py-3 px-4">Consignment Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Origin ➔ Dest</th>
                <th className="py-3 px-4">ETA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCargo.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No cargo shipments found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredCargo.map((item) => {
                  const isDelayed = item.status === 'Delayed' || item.delayHours > 0;
                  const isCritical = item.priority === 'CRITICAL';
                  const isHigh = item.priority === 'HIGH';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectCargo(item.id)}
                      className="hover:bg-sky-50/50 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                        {item.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isHigh
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{item.destination}</div>
                        <div className="text-[10px] text-slate-400">From {item.origin}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <div>{item.eta}</div>
                        {isDelayed && (
                          <span className="text-[10px] font-bold text-rose-600 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>+{item.delayHours}h</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isDelayed
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${
                                item.riskScore > 60
                                  ? 'bg-rose-500'
                                  : item.riskScore > 40
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, item.riskScore)}%` }}
                            ></div>
                          </div>
                          <span className="font-mono font-bold text-[11px] text-slate-700">
                            {item.riskScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={(e) => handleSimulateDelay(item.id, e)}
                          title="Simulate +48h delay on this cargo item"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                        {canEditOperationalData && (
                          <button
                            onClick={(e) => handleDeleteCargo(item.id, e)}
                            title="Delete cargo record"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 inline group-hover:text-sky-600 group-hover:translate-x-0.5 transition" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cargo Consignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Cargo Consignment"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Consignment ID / Code</label>
              <input
                type="text"
                placeholder="e.g. MED-025 or auto-assign"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-hidden"
              >
                <option value="Medical">Medical</option>
                <option value="Food">Food</option>
                <option value="Fuel">Fuel</option>
                <option value="Scientific">Scientific</option>
                <option value="Spare Parts">Spare Parts</option>
                <option value="Construction">Construction</option>
                <option value="Machinery">Machinery</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Manifest Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency Surgical Supplies & Cold-Chain Plasma"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Weight (kg)</label>
              <input
                type="number"
                required
                min={1}
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Mission Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-hidden"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Origin Port/Depot</label>
              <input
                type="text"
                required
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Destination Station</label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Estimated Arrival (ETA)</label>
              <input
                type="date"
                required
                value={formData.eta}
                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Carrier Vessel / Flight</label>
              <input
                type="text"
                value={formData.vesselName}
                onChange={(e) => setFormData({ ...formData, vesselName: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Consignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

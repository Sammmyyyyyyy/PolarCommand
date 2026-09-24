import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Plus,
  Search,
  Filter,
  Truck,
  Plane,
  Ship,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  Users,
  Package,
  Wind,
} from 'lucide-react';
import { Movement } from '../types';
import { fetchMovements, createMovement, updateMovement, applyMovementWeatherConstraint } from '../services/api';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

export const MovementsPage: React.FC = () => {
  const { currentExpeditionId, currentExpedition, dashboard, triggerRefresh } = useExpedition();
  const { canEditOperationalData } = useAuth();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'OVERLAND_TRAVERSE',
    originStation: 'Bharati Station',
    destStation: 'Maitri Station',
    departureDate: new Date().toISOString().split('T')[0],
    arrivalDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
    vehicleId: '',
    vesselName: '',
    flightNumber: '',
    notes: '',
  });

  const loadMovements = async () => {
    if (!currentExpeditionId) return;
    try {
      setIsLoading(true);
      const data = await fetchMovements(currentExpeditionId);
      setMovements(data);
    } catch (err) {
      console.error('Failed to load movements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [currentExpeditionId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpeditionId) return;
    try {
      setIsSubmitting(true);
      await createMovement(currentExpeditionId, formData);
      setIsModalOpen(false);
      setFormData({
        title: '',
        type: 'OVERLAND_TRAVERSE',
        originStation: 'Bharati Station',
        destStation: 'Maitri Station',
        departureDate: new Date().toISOString().split('T')[0],
        arrivalDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
        vehicleId: '',
        vesselName: '',
        flightNumber: '',
        notes: '',
      });
      await loadMovements();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create movement record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!currentExpeditionId) return;
    try {
      await updateMovement(currentExpeditionId, id, { status });
      await loadMovements();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update movement status');
    }
  };

  const handleApplyWeather = async (movementId: string) => {
    if (!currentExpeditionId) return;
    const stationId = dashboard?.stationsSummary[0]?.id;
    if (!stationId) {
      alert('No station found to evaluate local weather conditions for transit route.');
      return;
    }
    try {
      const updated = await applyMovementWeatherConstraint(currentExpeditionId, movementId, stationId);
      await loadMovements();
      triggerRefresh();
      alert(`Open-Meteo Weather Constraint Applied: ${updated.weatherConstraint || 'Weather evaluated nominal.'}`);
    } catch (err: any) {
      alert(`Weather constraint evaluation failed: ${err.message}`);
    }
  };

  const filtered = movements.filter((m) => {
    const matchesSearch =
      (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.originStation || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.destStation || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === 'All' || m.type === selectedType;
    const matchesStatus = selectedStatus === 'All' || m.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AIR_TRANSFER':
      case 'EMERGENCY_EVAC':
        return <Plane className="w-4 h-4 text-sky-600" />;
      case 'MARITIME_VOYAGE':
        return <Ship className="w-4 h-4 text-indigo-600" />;
      case 'OVERLAND_TRAVERSE':
      default:
        return <Truck className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Transit & Movement Control
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-mono font-bold border border-sky-200">
              {movements.length} Active Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Inter-station overland traverses, polar air shuttles, and maritime resupply voyages for{' '}
            <strong className="text-slate-800">{currentExpedition?.code || 'Active Expedition'}</strong>
          </p>
        </div>

        {canEditOperationalData && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Plan Movement</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, route, station..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg">
            {['All', 'OVERLAND_TRAVERSE', 'AIR_TRANSFER', 'MARITIME_VOYAGE', 'EMERGENCY_EVAC'].map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    selectedType === type
                      ? 'bg-sky-600 text-white font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              )
            )}
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
            <option value="Delayed">Delayed</option>
          </select>
        </div>
      </div>

      {/* Movement Cards / Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
          Loading movement records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-200 text-center">
          <Navigation className="w-8 h-8 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No transit movements found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            There are currently no active or planned transit movements matching this criteria.
          </p>
          {canEditOperationalData && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition"
            >
              Log New Movement
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isCompleted = item.status === 'Completed';
            const isDelayed = item.status === 'Delayed';
            const isInTransit = item.status === 'In Transit';

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      {getTypeIcon(item.type || 'OVERLAND_TRAVERSE')}
                      <span>{item.movementCode || (item.type || 'TRANSIT').replace('_', ' ')}</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isDelayed
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : isInTransit
                          ? 'bg-sky-50 text-sky-700 border border-sky-200 animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 mb-2">{item.title}</h3>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Route:</span>
                      <span className="font-bold text-slate-800">
                        {item.originStation} ➔ {item.destStation}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Schedule:</span>
                      <span className="font-mono text-slate-700">
                        {item.departureDate} to {item.arrivalDate}
                      </span>
                    </div>
                    {item.delayHours && item.delayHours > 0 && (
                      <div className="flex items-center justify-between text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 font-bold">
                        <span>Operational Delay:</span>
                        <span>+{item.delayHours} Hours</span>
                      </div>
                    )}
                    {item.vesselName && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Vessel / Asset:</span>
                        <span className="font-medium text-slate-800">{item.vesselName}</span>
                      </div>
                    )}
                    {item.flightNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Flight:</span>
                        <span className="font-medium text-slate-800">{item.flightNumber}</span>
                      </div>
                    )}
                  </div>

                  {item.weatherConstraint && (
                    <div className="mt-2.5 p-2 bg-amber-50/90 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start space-x-1.5">
                      <Wind className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Weather Constraint:</strong> {item.weatherConstraint}
                      </div>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 mt-2 italic">"{item.notes}"</p>
                  )}
                </div>

                {canEditOperationalData && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => handleApplyWeather(item.id)}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold transition flex items-center space-x-1 text-[11px]"
                      title="Fetch live Open-Meteo station telemetry and calculate weather delay & travel feasibility"
                    >
                      <Wind className="w-3 h-3 text-amber-600" />
                      <span>Check Weather Delay</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      {item.status !== 'Completed' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'Completed')}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-semibold transition"
                        >
                          Arrived
                        </button>
                      )}
                      {item.status !== 'In Transit' && item.status !== 'Completed' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'In Transit')}
                          className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded font-semibold transition"
                        >
                          Depart
                        </button>
                      )}
                      {item.status !== 'Delayed' && item.status !== 'Completed' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'Delayed')}
                          className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded font-semibold transition"
                        >
                          Delay
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Plan New Movement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Plan New Transit Movement"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Mission / Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Maitri-Bharati Fuel Convoy"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Transit Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-hidden"
              >
                <option value="OVERLAND_TRAVERSE">Overland Traverse</option>
                <option value="AIR_TRANSFER">Air Transfer</option>
                <option value="MARITIME_VOYAGE">Maritime Voyage</option>
                <option value="EMERGENCY_EVAC">Emergency Evacuation</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Vehicle / Vessel</label>
              <input
                type="text"
                placeholder="e.g. PB-04 PistenBully / Basler BT-67"
                value={formData.vehicleId || formData.vesselName || formData.flightNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vehicleId: e.target.value,
                    vesselName: e.target.value,
                    flightNumber: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Origin</label>
              <input
                type="text"
                required
                value={formData.originStation}
                onChange={(e) => setFormData({ ...formData, originStation: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Destination</label>
              <input
                type="text"
                required
                value={formData.destStation}
                onChange={(e) => setFormData({ ...formData, destStation: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Departure Date</label>
              <input
                type="date"
                required
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Estimated Arrival</label>
              <input
                type="date"
                required
                value={formData.arrivalDate}
                onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Operational Notes</label>
            <textarea
              rows={2}
              placeholder="Convoy crew, cargo load, sastrugi navigation notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
            />
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
              {isSubmitting ? 'Creating...' : 'Register Movement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

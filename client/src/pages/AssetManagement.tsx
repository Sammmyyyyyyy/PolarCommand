import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  X,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { Asset } from '../types';
import { createAsset, recordAssetMaintenance, deleteAsset } from '../services/api';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

interface AssetManagementProps {
  assetsList: Asset[];
  onRefreshData?: () => void;
}

export const AssetManagement: React.FC<AssetManagementProps> = ({
  assetsList,
  onRefreshData,
}) => {
  const { currentExpeditionId, currentExpedition, dashboard, triggerRefresh } = useExpedition();
  const { canEditOperationalData } = useAuth();

  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStation, setSelectedStation] = useState<string>('All');
  const [inspectingAsset, setInspectingAsset] = useState<Asset | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'Snow Vehicle',
    stationId: 'bharati',
    operatingHours: 120,
    maintenanceInterval: 500,
    fuelConsumptionPerHour: 18,
    status: 'Operational',
  });

  const availableStations = dashboard?.stationsSummary && dashboard.stationsSummary.length > 0
    ? dashboard.stationsSummary
    : [
        { id: 'bharati', name: 'Bharati Station' },
        { id: 'maitri', name: 'Maitri Station' },
      ];

  const types = [
    'All',
    'Snow Vehicle',
    'Generator',
    'Crane',
    'Scientific Equipment',
    'Utility Machinery',
  ];

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpeditionId) return;
    try {
      setIsSubmitting(true);
      await createAsset(currentExpeditionId, {
        id: formData.id || undefined,
        name: formData.name,
        type: formData.type,
        stationId: formData.stationId,
        operatingHours: Number(formData.operatingHours),
        maintenanceInterval: Number(formData.maintenanceInterval),
        fuelConsumptionPerHour: Number(formData.fuelConsumptionPerHour),
        status: formData.status,
      });
      setIsModalOpen(false);
      setFormData({
        id: '',
        name: '',
        type: 'Snow Vehicle',
        stationId: availableStations[0]?.id || 'bharati',
        operatingHours: 120,
        maintenanceInterval: 500,
        fuelConsumptionPerHour: 18,
        status: 'Operational',
      });
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to register asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaintenance = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentExpeditionId) return;
    try {
      await recordAssetMaintenance(currentExpeditionId, assetId);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      alert(`Maintenance recorded for asset ${assetId}. Operating hours reset and health restored to 100%.`);
    } catch (err: any) {
      alert(err.message || 'Error recording maintenance');
    }
  };

  const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentExpeditionId || !confirm(`Delete asset record ${assetId}?`)) return;
    try {
      await deleteAsset(currentExpeditionId, assetId);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error deleting asset');
    }
  };

  const filteredAssets = assetsList.filter((a) => {
    const matchesType = selectedType === 'All' || a.type.toLowerCase() === selectedType.toLowerCase();
    const matchesStation =
      selectedStation === 'All' ||
      a.stationId.toLowerCase() === selectedStation.toLowerCase() ||
      (a.station && a.station.id.toLowerCase() === selectedStation.toLowerCase());

    return matchesType && matchesStation;
  });

  const operationalCount = assetsList.filter((a) => a.status === 'Operational').length;
  const maintenanceDueCount = assetsList.filter(
    (a) => a.maintenanceInterval - a.operatingHours <= 0 || a.status === 'Maintenance'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header matching Screen 6 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Asset Management & Equipment Health
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 font-mono">
              {assetsList.length} Station Assets
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet tracking for snow vehicles, prime diesel generators, cranes, and scientific radar stations for{' '}
            <strong className="text-slate-800">{currentExpedition?.code || 'Active Expedition'}</strong>
          </p>
        </div>

        {canEditOperationalData && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        )}
      </div>

      {/* Filter and Dropdowns Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Type Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs py-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedType === t
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Station filter dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Station:</span>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Stations</option>
            {availableStations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Equipment Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Station Base</th>
                <th className="py-3 px-4">Operating Hours</th>
                <th className="py-3 px-4">Health Index</th>
                <th className="py-3 px-4">Maintenance Window</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No assets found. Click "+ Add Asset" above to register vehicles or generators.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const hoursUntilService = asset.maintenanceInterval - asset.operatingHours;
                  const isMaintenanceDue = hoursUntilService <= 0;
                  const isMaintenanceWarning = hoursUntilService < 50 && !isMaintenanceDue;

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setInspectingAsset(asset)}
                      className="hover:bg-sky-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                        {asset.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{asset.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{asset.type}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {asset.station?.name || asset.stationId}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-800">
                        {asset.operatingHours}h / {asset.maintenanceInterval}h
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                (asset.healthScore ?? 100) < 50
                                  ? 'bg-rose-500'
                                  : (asset.healthScore ?? 100) < 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${asset.healthScore ?? 100}%` }}
                            ></div>
                          </div>
                          <span className="font-mono font-bold text-[11px] text-slate-700">
                            {asset.healthScore ?? 100}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isMaintenanceDue ? (
                          <span className="text-rose-600 font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Overdue ({Math.abs(hoursUntilService)}h)</span>
                          </span>
                        ) : isMaintenanceWarning ? (
                          <span className="text-amber-600 font-semibold flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Due in {hoursUntilService}h</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">{hoursUntilService}h remaining</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            asset.status === 'Operational'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : asset.status === 'Maintenance'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        {canEditOperationalData && (
                          <button
                            onClick={(e) => handleMaintenance(asset.id, e)}
                            title="Record Service / Reset Maintenance Window"
                            className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded font-semibold text-[11px] transition inline-flex items-center space-x-1"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>Service</span>
                          </button>
                        )}
                        {canEditOperationalData && (
                          <button
                            onClick={(e) => handleDeleteAsset(asset.id, e)}
                            title="Delete Asset Record"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 inline group-hover:text-sky-600 transition" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Station Equipment Asset"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Asset Code / ID</label>
              <input
                type="text"
                placeholder="e.g. PB-05 or GEN-03"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                <option value="Snow Vehicle">Snow Vehicle</option>
                <option value="Generator">Generator</option>
                <option value="Crane">Crane</option>
                <option value="Scientific Equipment">Scientific Equipment</option>
                <option value="Utility Machinery">Utility Machinery</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Asset / Model Name</label>
            <input
              type="text"
              required
              placeholder="e.g. PistenBully 300 Polar Tracked Snowcat"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Station Base</label>
              <select
                value={formData.stationId}
                onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
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
              <label className="block text-slate-700 font-bold mb-1">Operational Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                <option value="Operational">Operational</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Current Hours</label>
              <input
                type="number"
                required
                min={0}
                value={formData.operatingHours}
                onChange={(e) => setFormData({ ...formData, operatingHours: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Service Interval (h)</label>
              <input
                type="number"
                required
                min={10}
                value={formData.maintenanceInterval}
                onChange={(e) => setFormData({ ...formData, maintenanceInterval: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Fuel (L/h)</label>
              <input
                type="number"
                required
                min={0}
                value={formData.fuelConsumptionPerHour}
                onChange={(e) => setFormData({ ...formData, fuelConsumptionPerHour: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden"
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
              {isSubmitting ? 'Registering...' : 'Register Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Asset Inspection Modal */}
      {inspectingAsset && (
        <Modal
          isOpen={true}
          onClose={() => setInspectingAsset(null)}
          title={`Asset Inspection: ${inspectingAsset.name} (${inspectingAsset.id})`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-medium block">Station Location</span>
                <span className="font-bold text-slate-800 text-sm">
                  {inspectingAsset.station?.name || inspectingAsset.stationId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Health Index</span>
                <span className="font-bold text-emerald-600 text-sm">{inspectingAsset.healthScore}%</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Fuel Consumption</span>
                <span className="font-mono font-bold text-slate-800">
                  {inspectingAsset.fuelConsumptionPerHour} Litres/hr
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Operating Hours</span>
                <span className="font-mono font-bold text-slate-800">
                  {inspectingAsset.operatingHours}h (Interval: {inspectingAsset.maintenanceInterval}h)
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-bold text-slate-800 mb-2">Autonomous Maintenance Rule</h4>
              <p className="text-slate-500 leading-relaxed">
                When equipment operating hours exceed interval thresholds under sub-zero conditions (-35°C), failure
                probabilities increase exponentially. Scheduling proactive maintenance resets system risk factors.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              {canEditOperationalData && (
                <button
                  onClick={(e) => {
                    handleMaintenance(inspectingAsset.id, e);
                    setInspectingAsset(null);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                >
                  Record Overhaul / Reset Hours
                </button>
              )}
              <button
                onClick={() => setInspectingAsset(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

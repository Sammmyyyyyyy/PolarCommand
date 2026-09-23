import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  AlertTriangle,
  Truck,
  HeartPulse,
  UserX,
  PackageX,
  WifiOff,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  Radio,
} from 'lucide-react';
import { Incident } from '../types';
import { createIncident, updateIncident, dispatchIncidentResponse } from '../services/api';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

interface EmergencyResponseProps {
  incidentsList: Incident[];
  onRefreshData?: () => void;
  onNavigate?: (path: string) => void;
}

export const EmergencyResponse: React.FC<EmergencyResponseProps> = ({
  incidentsList,
  onRefreshData,
  onNavigate,
}) => {
  const { currentExpeditionId, currentExpedition, triggerRefresh } = useExpedition();
  const { canExecuteActions, canEditOperationalData } = useAuth();

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    incidentsList.find((i) => i.status !== 'Resolved') || incidentsList[0] || null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newType, setNewType] = useState<Incident['type']>('Vehicle Breakdown');
  const [newLocation, setNewLocation] = useState('18 km South of Bharati');
  const [newAffected, setNewAffected] = useState(3);
  const [newDescription, setNewDescription] = useState('Snow vehicle track motor jammed in sastrugi snow ridge.');
  const [isCreating, setIsCreating] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const incidentCategories = [
    { type: 'Vehicle Breakdown', icon: Truck },
    { type: 'Medical Emergency', icon: HeartPulse },
    { type: 'Missing Personnel', icon: UserX },
    { type: 'Cargo Damage', icon: PackageX },
    { type: 'Communication Failure', icon: WifiOff },
    { type: 'Fire / Safety', icon: Flame },
  ];

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpeditionId) return;
    try {
      setIsCreating(true);
      const created = await createIncident(currentExpeditionId, {
        type: newType,
        title: `${newType} Incident`,
        location: newLocation,
        severity: 'CRITICAL',
        peopleAffected: Number(newAffected),
        description: newDescription,
      });
      setIsModalOpen(false);
      setSelectedIncident(created);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error creating incident');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDispatchAction = async () => {
    if (!selectedIncident || !currentExpeditionId) return;
    try {
      setIsDispatching(true);
      await dispatchIncidentResponse(currentExpeditionId, selectedIncident.id, {
        targetStation: selectedIncident.responsePlan?.nearestStation || 'Bharati Station',
        vehicleId: selectedIncident.responsePlan?.nearestVehicleId || 'PB-07',
        doctorName: selectedIncident.responsePlan?.nearestPersonnelName || 'Dr. Anita Singh',
        notes: `Emergency response dispatched for incident ${selectedIncident.id} at ${selectedIncident.location}`,
      });
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      alert('Rescue dispatch action created! Registered in Alerts & Action Center.');
      if (onNavigate) onNavigate('/alerts');
    } catch (err: any) {
      alert(err.message || 'Error dispatching action');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleResolveIncident = async () => {
    if (!selectedIncident || !currentExpeditionId) return;
    try {
      await updateIncident(currentExpeditionId, selectedIncident.id, { status: 'Resolved' });
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      alert('Incident marked as resolved. Expedition safety index updated.');
    } catch (err: any) {
      alert(err.message || 'Error resolving incident');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching Screen 8 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Emergency Response Center
            </h1>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 animate-pulse">
              Active Protocol
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomous rescue triage, nearest operational asset routing, and rapid emergency response dispatch for{' '}
            <strong className="text-slate-800">{currentExpedition?.code || 'Active Expedition'}</strong>
          </p>
        </div>

        {canEditOperationalData && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Incident</span>
          </button>
        )}
      </div>

      {/* Incident Category Quick Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {incidentCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.type}
              onClick={() => {
                if (canEditOperationalData) {
                  setNewType(cat.type as any);
                  setIsModalOpen(true);
                }
              }}
              className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-rose-300 hover:shadow-xs transition cursor-pointer text-center group"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-50 group-hover:bg-rose-50 text-slate-600 group-hover:text-rose-600 flex items-center justify-center mx-auto transition">
                <Icon className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs text-slate-900 mt-2">{cat.type}</div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recent Incidents List (Left) + Response Engine Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Incidents Table */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-extrabold text-sm text-slate-900">Incident Manifest</span>
            <span className="text-xs text-slate-400 font-mono">{incidentsList.length} Logged</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {incidentsList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                No emergency incidents logged. All on-ice operations safe.
              </div>
            ) : (
              incidentsList.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCritical = inc.severity === 'CRITICAL';
                const isResolved = inc.status === 'Resolved';

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 transition cursor-pointer ${
                      isSelected ? 'bg-rose-50/50 border-l-4 border-rose-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-slate-900">{inc.id}</span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                          isCritical ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </div>

                    <div className="font-bold text-xs text-slate-900">{inc.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{inc.location}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] mt-2 pt-1 border-t border-slate-100">
                      <span
                        className={`font-semibold ${
                          isResolved ? 'text-emerald-600' : 'text-amber-600 animate-pulse'
                        }`}
                      >
                        {inc.status}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {inc.timestamp || new Date(inc.createdAt || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Incident Response Engine Detail Panel */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-5">
          {selectedIncident ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono text-rose-600 font-bold">
                    Incident Response Triage
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900">{selectedIncident.title}</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg">
                    {selectedIncident.peopleAffected} Personnel Affected
                  </span>
                  {selectedIncident.status !== 'Resolved' && canEditOperationalData && (
                    <button
                      onClick={handleResolveIncident}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-lg transition"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              {/* Triage Resources Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                    Nearest Station Base
                  </span>
                  <span className="font-bold text-slate-900 text-xs mt-1 block">
                    {selectedIncident.responsePlan?.nearestStation || 'Bharati Station (25 km)'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                    Assigned Vehicle
                  </span>
                  <span className="font-bold text-sky-700 text-xs mt-1 block">
                    {selectedIncident.responsePlan?.nearestVehicleId || 'PB-07 (Rescue Cab)'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                    Triage Lead
                  </span>
                  <span className="font-bold text-slate-900 text-xs mt-1 block">
                    {selectedIncident.responsePlan?.nearestPersonnelName || 'Dr. Anita Singh'}
                  </span>
                </div>
              </div>

              {/* Recommended Response Steps */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Recommended Autonomous Response Plan:
                  </span>
                </div>

                <div className="space-y-2">
                  {(selectedIncident.responsePlan?.steps || [
                    'Dispatch PB-07 Rescue snow vehicle immediately',
                    'Send medical triage team (Dr. Anita Singh + Paramedic)',
                    'Carry replacement hydraulic belt & thermal survival gear',
                    'Establish continuous VHF radio frequency 148.55 MHz',
                    'Notify Bharati Station Operations Command',
                  ]).map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-800 font-medium"
                    >
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description Detail */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-0.5">Incident Report:</span>
                {selectedIncident.description}
              </div>

              {/* Create Response Action CTA button */}
              {selectedIncident.status !== 'Resolved' && (
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Estimated Transit Time:{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {selectedIncident.responsePlan?.etaMinutes || 45} mins
                    </span>
                  </div>

                  <button
                    onClick={handleDispatchAction}
                    disabled={isDispatching || !canExecuteActions}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    <span>{isDispatching ? 'DISPATCHING...' : 'DISPATCH RESCUE ACTION'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Select an incident from the list to view response triage and dispatch recommendations.
            </div>
          )}
        </div>
      </div>

      {/* Report Incident Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Report Field Emergency Incident"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Incident Category</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
            >
              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Missing Personnel">Missing Personnel</option>
              <option value="Cargo Damage">Cargo Damage</option>
              <option value="Communication Failure">Communication Failure</option>
              <option value="Fire / Safety">Fire / Safety</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Location Coordinates / Landmark</label>
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">People Affected</label>
            <input
              type="number"
              value={newAffected}
              onChange={(e) => setNewAffected(Number(e.target.value))}
              min={0}
              max={20}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Incident Summary</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
            >
              {isCreating ? 'Dispatching...' : 'Submit & Generate Triage'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

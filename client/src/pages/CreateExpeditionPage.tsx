import React, { useState, useEffect } from 'react';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  MapPin,
  Building2,
  Users,
  Shield,
  Layers,
  FileText,
} from 'lucide-react';
import { useExpedition } from '../context/ExpeditionContext';
import { createExpedition, fetchAllUsers } from '../services/api';
import { User } from '../types';

interface CreateExpeditionPageProps {
  onNavigate?: (path: string) => void;
  onCancel?: () => void;
  onCreated?: (expedition: any) => void;
}

export const CreateExpeditionPage: React.FC<CreateExpeditionPageProps> = ({
  onNavigate = () => {},
  onCancel,
  onCreated,
}) => {
  const { switchExpedition, triggerRefresh } = useExpedition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Step 1: Basic Information
  const [code, setCode] = useState('ARCTIC-2028');
  const [title, setTitle] = useState('Arctic Cryosphere & Climate Traverse');
  const [type, setType] = useState('Atmospheric & Climate Science');
  const [missionObjective, setMissionObjective] = useState(
    'Atmospheric boundary layer profiling, Svalbard glacier mass balance, and rapid response meteorological observation.'
  );
  const [commanderId, setCommanderId] = useState('');
  const [commanderName, setCommanderName] = useState('Dr. Priya Sharma');
  const [startDate, setStartDate] = useState('2028-03-01');
  const [endDate, setEndDate] = useState('2029-03-31');
  const [priority, setPriority] = useState('HIGH');
  const [notes, setNotes] = useState('Joint international polar institute scientific collaboration.');

  // Step 2: Route & Corridors
  const [origin, setOrigin] = useState('Tromsø Polar Logistics Base, Norway');
  const [destination, setDestination] = useState('Ny-Ålesund Research Station, Svalbard');
  const [intermediateHubs, setIntermediateHubs] = useState('Longyearbyen Air Staging Port');
  const [transportModes, setTransportModes] = useState('Icebreaker Vessel, Twin Otter Ski-Plane, Snowcat');

  // Step 3: Operational Configuration & Stations
  const [stationName, setStationName] = useState('Himadri Polar Research Base');
  const [stationCode, setStationCode] = useState('HIMADRI');
  const [stationRegion, setStationRegion] = useState('Ny-Ålesund, Spitsbergen, Svalbard');
  const [stationLat, setStationLat] = useState('78.923');
  const [stationLng, setStationLng] = useState('11.923');
  const [stationCapacity, setStationCapacity] = useState('25');
  const [expectedPersonnel, setExpectedPersonnel] = useState('18');

  useEffect(() => {
    fetchAllUsers()
      .then((u) => {
        setUsers(u);
        const commander = u.find((item) => item.role === 'COMMANDER');
        if (commander) {
          setCommanderId(commander.id);
          setCommanderName(commander.name);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        code,
        title,
        type,
        missionObjective,
        commanderId: commanderId || undefined,
        commanderName,
        startDate,
        endDate,
        origin,
        destination,
        intermediateHubs,
        transportModes,
        priority,
        notes,
        initialStations: [
          {
            name: stationName,
            code: stationCode,
            region: stationRegion,
            latitude: parseFloat(stationLat) || 78.92,
            longitude: parseFloat(stationLng) || 11.92,
            capacity: parseInt(stationCapacity, 10) || 25,
          },
        ],
      };

      const created = await createExpedition(payload);
      triggerRefresh();
      if (onCreated) {
        onCreated(created);
      } else {
        switchExpedition(created.id);
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create expedition');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Wizard Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : onNavigate('/expeditions'))}
            className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Expedition Hub</span>
          </button>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Commission New Polar Expedition
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure expedition parameters, transit corridors, and initial base station infrastructure
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center space-x-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                step === s
                  ? 'bg-sky-600 text-white shadow-xs'
                  : step > s
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
              <span>Step 1 of 3 — Basic Expedition Identification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expedition Code / ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ARCTIC-2028"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mission Priority *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expedition Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Arctic Cryosphere & Climate Traverse"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expedition Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Atmospheric & Climate Science"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expedition Commander
                </label>
                {users.length > 0 ? (
                  <select
                    value={commanderId}
                    onChange={(e) => {
                      setCommanderId(e.target.value);
                      const u = users.find((item) => item.id === e.target.value);
                      if (u) setCommanderName(u.name);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                  >
                    <option value="">Select Commander from User Directory</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Commander Name"
                    value={commanderName}
                    onChange={(e) => setCommanderName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mission Objective *
              </label>
              <textarea
                required
                rows={3}
                value={missionObjective}
                onChange={(e) => setMissionObjective(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition"
              >
                <span>Continue to Route & Corridors</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Route & Transit Corridors */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
              <span>Step 2 of 3 — Route & Maritime / Aviation Corridors</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Origin *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tromsø Polar Logistics Base, Norway"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destination *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ny-Ålesund Research Station, Svalbard"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Intermediate Logistics Hubs
              </label>
              <input
                type="text"
                placeholder="e.g. Longyearbyen Air Staging Port"
                value={intermediateHubs}
                onChange={(e) => setIntermediateHubs(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transport Modes
              </label>
              <input
                type="text"
                placeholder="e.g. Icebreaker Vessel, Ski-Plane, Snowcat"
                value={transportModes}
                onChange={(e) => setTransportModes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition"
              >
                <span>Continue to Operational Configuration</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Operational Configuration & Stations */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
              <span>Step 3 of 3 — Base Station & Operational Infrastructure</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>Primary Base Station Infrastructure</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Station Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Station Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={stationCode}
                    onChange={(e) => setStationCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Geographic Region
                </label>
                <input
                  type="text"
                  value={stationRegion}
                  onChange={(e) => setStationRegion(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={stationLat}
                    onChange={(e) => setStationLat(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={stationLng}
                    onChange={(e) => setStationLng(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Bunk Capacity
                  </label>
                  <input
                    type="number"
                    value={stationCapacity}
                    onChange={(e) => setStationCapacity(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Personnel Roster Size
              </label>
              <input
                type="number"
                value={expectedPersonnel}
                onChange={(e) => setExpectedPersonnel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Directives</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              ></textarea>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Commissioning Expedition...' : 'Commission Expedition & Open Control'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

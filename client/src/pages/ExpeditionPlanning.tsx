import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Plus,
  Target,
  Users,
  Package,
  Layers,
  FileText,
  MapPin,
} from 'lucide-react';
import { Expedition } from '../types';

interface ExpeditionPlanningProps {
  expedition: Expedition | null;
  onNavigate?: (path: string) => void;
}

export const ExpeditionPlanning: React.FC<ExpeditionPlanningProps> = ({ expedition, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'cargo' | 'personnel' | 'route' | 'emergency'>('timeline');

  if (!expedition) return null;

  const timelinePhases = [
    { name: 'Planning', date: 'Mar 2025', status: 'completed' },
    { name: 'Procurement', date: 'Sep 2025', status: 'completed' },
    { name: 'Shipping', date: 'Nov 2025', status: 'completed' },
    { name: 'Deployment', date: 'Dec 2025 - Mar 2026', status: 'completed' },
    { name: 'Operations', date: 'Nov 2026 - Nov 2027', status: 'in-progress' },
    { name: 'Return', date: 'Apr 2027', status: 'upcoming' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & New Expedition Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Expedition Planning ({expedition.code})
            </h1>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              {expedition.status || 'Active Phase'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {expedition.name} • Operational timeline and milestone verification
          </p>
        </div>

        <button
          onClick={() => (onNavigate ? onNavigate('/expeditions/new') : alert('Navigating to wizard'))}
          className="flex items-center space-x-2 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Expedition</span>
        </button>
      </div>

      {/* Sub-navigation Tabs matching Reference Screen 2 */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'cargo', label: 'Cargo Plan' },
          { id: 'personnel', label: 'Personnel Plan' },
          { id: 'route', label: 'Route Plan' },
          { id: 'emergency', label: 'Emergency Protocol' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Expedition Timeline (Left) + Expedition Details Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Expedition Timeline & Milestones */}
        <div className="lg:col-span-7 space-y-6">
          {/* Timeline Phase Stepper */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="font-extrabold text-sm text-slate-900">Expedition Timeline</div>

            {/* Stepper Graphic */}
            <div className="relative flex items-center justify-between pt-2 pb-4">
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0"></div>
              {timelinePhases.map((phase, idx) => {
                const isCompleted = phase.status === 'completed';
                const isCurrent = phase.status === 'in-progress';

                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${
                        isCompleted
                          ? 'bg-sky-600 text-white'
                          : isCurrent
                          ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className="font-bold text-[11px] text-slate-800 mt-2">{phase.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{phase.date}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Milestones List */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-extrabold text-sm text-slate-900">Key Milestones</span>
              <span className="text-xs text-sky-700 font-bold">Progress Verified</span>
            </div>

            <div className="space-y-2.5">
              {(expedition.milestones || [
                { id: 'm1', title: 'Pre-departure Vessel Readiness & NCPOR Lashing', date: 'Oct 2026', status: 'completed' },
                { id: 'm2', title: 'Maritime Transit to Larsemann Ice Shelf', date: 'Dec 2026', status: 'completed' },
                { id: 'm3', title: 'Station Fuel & Food Replenishment Offloading', date: 'Jan 2027', status: 'completed' },
                { id: 'm4', title: 'Traverse Overland Convoy (Bharati ➔ Maitri)', date: 'Feb 2027', status: 'in-progress' },
                { id: 'm5', title: 'Wintering Team Station Handover Protocol', date: 'Apr 2027', status: 'upcoming' },
              ]).map((m) => {
                const isDone = m.status === 'completed';
                const isCurrent = m.status === 'in-progress';

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs transition ${
                      isDone
                        ? 'bg-slate-50/70 border-slate-200'
                        : isCurrent
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-white border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isDone
                            ? 'text-emerald-600'
                            : isCurrent
                            ? 'text-amber-600'
                            : 'text-slate-300'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isCurrent ? (
                          <Clock className="w-5 h-5 animate-spin" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{m.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.date}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-700'
                          : isCurrent
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Expedition Details Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Header graphic banner */}
            <div className="bg-gradient-to-r from-sky-700 to-slate-900 p-5 text-white">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
                Official Expedition Dossier
              </div>
              <h2 className="text-xl font-extrabold mt-0.5">{expedition.code}</h2>
              <p className="text-xs text-slate-200 mt-1">{expedition.title || expedition.name}</p>
            </div>

            {/* Content Stats Grid */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px] block">Duration</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {expedition.startDate} - {expedition.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Active Stations</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {Array.isArray(expedition.stations) && expedition.stations.length > 0
                      ? expedition.stations.map((s: any) => typeof s === 'string' ? s : s.name).join(', ')
                      : 'Bharati, Maitri'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Total Registered Personnel</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {expedition.personnelCount ?? expedition.personnel?.length ?? 42}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Cargo Manifest Total</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {expedition.totalCargoCount ?? expedition.cargo?.length ?? 187} Shipments
                  </span>
                </div>
              </div>

              {/* Primary Scientific & Operational Objectives */}
              <div>
                <span className="font-bold text-slate-800 text-xs block mb-2">
                  Primary Expedition Objectives:
                </span>
                <ul className="space-y-1.5 text-slate-600 text-xs">
                  {(expedition.objectives || [
                    'Atmospheric aerosol profiling & polar vortex ozone depletion monitoring',
                    'Cryo-coring & subglacial lake sediment recovery at Larsemann Hills',
                    'Autonomous uncrewed traverse rover telemetry validation',
                    'Maintenance and wintering life-support system verification',
                  ]).map((obj, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <Target className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-xs">Station Operations Status</div>
                  <div className="text-[11px] text-slate-500">Maitri & Bharati telemetry synchronized</div>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px]">
                  Nominal
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

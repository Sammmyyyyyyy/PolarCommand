import React, { useState } from 'react';
import {
  Package,
  ArrowLeft,
  Ship,
  MapPin,
  Calendar,
  Weight,
  Clock,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { CargoShipment, CargoDelaySimulationResponse } from '../types';
import { simulateCargoDelay } from '../services/api';

interface CargoDetailProps {
  cargo: CargoShipment;
  onBack: () => void;
  onRefreshData?: () => void;
  onNavigate?: (path: string) => void;
}

export const CargoDetail: React.FC<CargoDetailProps> = ({
  cargo,
  onBack,
  onRefreshData,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'impact' | 'inventory'>('overview');
  const [selectedDelay, setSelectedDelay] = useState<number>(48);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<CargoDelaySimulationResponse | null>(null);

  const handleRunSimulation = async (delayHours: number) => {
    try {
      setIsSimulating(true);
      const res = await simulateCargoDelay(cargo.id, delayHours);
      setSimulationResult(res);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error running simulation');
    } finally {
      setIsSimulating(false);
    }
  };

  const isDelayed = cargo.status === 'Delayed' || cargo.delayHours > 0;

  const defaultJourney = [
    { stage: 'Depot Dispatch', location: cargo.origin, date: 'Dispatched', status: 'completed' as const },
    { stage: 'Maritime Transit', location: cargo.currentLocation || 'Southern Ocean Corridor', date: 'En Route', status: isDelayed ? ('delayed' as const) : ('current' as const) },
    { stage: 'Ice Shelf Staging', location: 'Antarctic Coastline', date: 'Upcoming', status: 'upcoming' as const },
    { stage: 'Station Delivery', location: cargo.destination, date: cargo.eta, status: 'upcoming' as const },
  ];
  const journeySteps = cargo.journey && cargo.journey.length > 0 ? cargo.journey : defaultJourney;

  const riskBreakdown = cargo.riskBreakdown || {
    delayImpact: cargo.delayHours > 0 ? Math.min(45, cargo.delayHours) : 10,
    cargoCriticality: cargo.priority === 'CRITICAL' ? 35 : cargo.priority === 'HIGH' ? 25 : 15,
    inventoryDependency: 15,
    weatherRisk: 12,
  };

  return (
    <div className="space-y-6">
      {/* Top Back & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Back to Cargo Manifest"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {cargo.id}
              </h1>
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-extrabold tracking-wider uppercase">
                {cargo.priority}
              </span>
              {isDelayed && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold">
                  DELAYED (+{cargo.delayHours}H)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{cargo.description}</p>
          </div>
        </div>

        {/* Quick Simulator Trigger */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
            {[24, 48, 72, 168].map((hours) => (
              <button
                key={hours}
                onClick={() => {
                  setSelectedDelay(hours);
                  handleRunSimulation(hours);
                }}
                disabled={isSimulating}
                className={`px-2.5 py-1 rounded-md transition ${
                  selectedDelay === hours
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                +{hours === 72 ? '3d' : hours === 168 ? '7d' : `${hours}h`}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleRunSimulation(selectedDelay)}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate Delay</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'timeline', label: 'Journey Timeline' },
          { id: 'impact', label: 'Impact Analysis' },
          { id: 'inventory', label: 'Related Inventory' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 border-b-2 transition ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Metadata Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Origin</span>
          <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cargo.origin}</span>
          <span className="text-[10px] text-slate-500">NCPOR Depot</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Destination</span>
          <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cargo.destination}</span>
          <span className="text-[10px] text-slate-500">Antarctica Station</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Weight</span>
          <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cargo.weightKg} kg</span>
          <span className="text-[10px] text-slate-500">Air/Sea Pod</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Location</span>
          <span className="font-bold text-sky-700 text-sm mt-0.5 block">{cargo.currentLocation || 'Southern Ocean'}</span>
          <span className="text-[10px] text-slate-500">Transshipment</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">ETA</span>
          <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{cargo.eta}</span>
          <span className="text-[10px] text-slate-500">{isDelayed ? 'Delayed Schedule' : 'On Schedule'}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Risk Score</span>
          <span className="font-extrabold text-rose-600 text-sm mt-0.5 block">
            {cargo.riskScore ?? 45}
            <span className="text-slate-400 text-xs font-normal">/100</span>
          </span>
          <span className="text-[10px] text-rose-600 font-semibold">{cargo.riskLevel || 'Normal'} Risk</span>
        </div>
      </div>

      {/* Main Journey Timeline Component */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="font-extrabold text-sm text-slate-900">
              Animated Cargo Journey Timeline
            </div>
            <div className="text-xs text-slate-500">
              Carrier: {cargo.vesselName || 'MV Polar Queen'} • Polar route tracking
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
            {isDelayed ? 'Schedule Flagged' : 'En Route'}
          </span>
        </div>

        {/* Horizontal Timeline Stepper */}
        <div className="relative pt-6 pb-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[650px] relative">
            {/* Connecting Track Line */}
            <div className="absolute left-6 right-6 top-5 h-1 bg-slate-200 z-0"></div>

            {journeySteps.map((step, idx) => {
              const isDone = step.status === 'completed';
              const isCurrent = step.status === 'current';
              const isStepDelayed = step.status === 'delayed';

              return (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center px-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition ${
                      isDone
                        ? 'bg-sky-600 text-white'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                        : isStepDelayed
                        ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isCurrent ? (
                      <Ship className="w-5 h-5" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-800 mt-2">{step.stage}</div>
                  <div className="text-[11px] text-slate-500 max-w-[100px] truncate">{step.location}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{step.date}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Risk Breakdown & Live Delay Simulation Cascade Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Breakdown Card */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-extrabold text-sm text-slate-900">Cargo Risk Breakdown</span>
            <span className="text-xs font-mono font-bold text-rose-600">Total: {cargo.riskScore ?? 45} / 100</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Delay Impact Factor</span>
              <span className="font-mono font-bold text-rose-600">+{riskBreakdown.delayImpact}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Cargo Criticality</span>
              <span className="font-mono font-bold text-rose-600">+{riskBreakdown.cargoCriticality}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Inventory Dependency</span>
              <span className="font-mono font-bold text-rose-600">+{riskBreakdown.inventoryDependency}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Southern Ocean Weather Risk</span>
              <span className="font-mono font-bold text-slate-700">+{riskBreakdown.weatherRisk}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
            Every risk metric is directly explainable. Delay impacts scale with inventory days remaining relative to
            safe minimums.
          </p>
        </div>

        {/* Live Simulation Cascade Output (Hero Scenario) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-extrabold text-sm text-slate-900">
              Downstream Operational Propagation
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-xs">
              Live Impact Chain
            </span>
          </div>

          {simulationResult ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div>
                  <span className="text-slate-500 text-[11px] block">Medical Stock Reserve</span>
                  <div className="text-base font-extrabold text-rose-700">
                    {simulationResult.impact.previousDaysRemaining} days ➔{' '}
                    <span className="underline">{simulationResult.impact.newDaysRemaining} days</span>
                  </div>
                  <span className="text-[10px] text-rose-600 font-semibold">
                    Breached 10-day safety threshold!
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Bharati Station Risk</span>
                  <div className="text-base font-extrabold text-rose-700">
                    {simulationResult.impact.previousStationRisk} ➔{' '}
                    <span className="underline">{simulationResult.impact.newStationRisk} / 100</span>
                  </div>
                  <span className="text-[10px] text-rose-600 font-semibold">High Risk Surge</span>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg space-y-2">
                <div className="font-bold text-sky-900 text-xs">Recommended Operational Response:</div>
                <div className="text-sky-800 text-xs font-medium">
                  {simulationResult.impact.recommendedAction}
                </div>
                <div className="pt-1 flex items-center space-x-2">
                  <button
                    onClick={() => onNavigate && onNavigate('/alerts')}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold transition"
                  >
                    View in Action Center
                  </button>
                  <button
                    onClick={() => onNavigate && onNavigate('/simulations')}
                    className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-semibold transition"
                  >
                    Open Impact Graph
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <Zap className="w-8 h-8 text-sky-600 mx-auto opacity-60" />
              <div className="text-xs font-semibold text-slate-700">Ready to simulate delay cascade</div>
              <p className="text-[11px] max-w-sm mx-auto">
                Trigger a +24h or +48h simulation above to see how this shipment directly impacts Bharati medical reserves,
                creates operational alerts, and computes mitigation actions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

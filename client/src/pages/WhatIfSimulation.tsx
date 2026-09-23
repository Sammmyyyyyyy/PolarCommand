import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Zap,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  GitFork,
  Boxes,
  ShieldAlert,
} from 'lucide-react';
import { runSimulation, applySimulation, executeHeroAction, fetchCargo } from '../services/api';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { CargoShipment } from '../types';

interface WhatIfSimulationProps {
  onRefreshData?: () => void;
  onNavigate?: (path: string) => void;
}

export const WhatIfSimulation: React.FC<WhatIfSimulationProps> = ({
  onRefreshData,
  onNavigate,
}) => {
  const { currentExpeditionId, currentExpedition, triggerRefresh } = useExpedition();
  const { canExecuteActions } = useAuth();

  const [cargoList, setCargoList] = useState<CargoShipment[]>([]);
  const [selectedScenarioType, setSelectedScenarioType] = useState<string>('cargo-delay');
  const [selectedCargo, setSelectedCargo] = useState('MED-024');
  const [delayDuration, setDelayDuration] = useState(48);
  const [consumptionMultiplier, setConsumptionMultiplier] = useState(1.4);
  const [isLoading, setIsLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [isApplyingAction, setIsApplyingAction] = useState(false);

  useEffect(() => {
    async function loadCargo() {
      if (!currentExpeditionId) return;
      try {
        const list = await fetchCargo(currentExpeditionId);
        setCargoList(list);
        if (list.length > 0 && !list.some((c) => c.id === selectedCargo)) {
          setSelectedCargo(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load cargo for simulation:', err);
      }
    }
    loadCargo();
  }, [currentExpeditionId]);

  const scenarioTabs = [
    { id: 'cargo-delay', label: 'Cargo Delay' },
    { id: 'weather-disruption', label: 'Weather Disruption' },
    { id: 'vehicle-failure', label: 'Vehicle Failure' },
    { id: 'personnel-unavailable', label: 'Personnel Unavailable' },
    { id: 'inventory-surge', label: 'Inventory Surge' },
    { id: 'shipment-cancellation', label: 'Shipment Cancellation' },
  ];

  const handleRun = async () => {
    if (!currentExpeditionId) return;
    try {
      setIsLoading(true);
      const res = await runSimulation(currentExpeditionId, {
        type: selectedScenarioType,
        cargoId: selectedCargo,
        delayHours: delayDuration,
        consumptionMultiplier,
      });
      setSimulationData(res);
    } catch (err: any) {
      alert(err.message || 'Error running simulation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyMitigation = async () => {
    if (!currentExpeditionId) return;
    try {
      setIsApplyingAction(true);
      if (simulationData?.simulationId) {
        await applySimulation(currentExpeditionId, simulationData.simulationId);
      } else {
        await executeHeroAction();
      }
      triggerRefresh();
      if (onRefreshData) onRefreshData();
      alert('Mitigation executed and committed to active expedition database state!');
      if (onNavigate) onNavigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error executing mitigation');
    } finally {
      setIsApplyingAction(false);
    }
  };

  const handleDiscard = () => {
    setSimulationData(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching Screen 9 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              What-If Scenario Simulation
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 font-mono">
              Decision Support Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Test supply chain disruptions, extreme weather spikes, and asset failures for{' '}
            <strong className="text-slate-800">{currentExpedition?.code || 'Active Expedition'}</strong> before committing on-ice decisions
          </p>
        </div>
      </div>

      {/* Scenario Selector Pills */}
      <div className="flex items-center space-x-1 overflow-x-auto text-xs font-semibold border-b border-slate-200 pb-2">
        {scenarioTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedScenarioType(tab.id);
              setSimulationData(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              selectedScenarioType === tab.id
                ? 'bg-sky-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Parameter Controls (Left 5) + Simulation Canvas / Output (Right 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Scenario Parameter Input Form */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <GitFork className="w-4 h-4 text-sky-600" />
            <span className="font-extrabold text-sm text-slate-900">Configure Sandbox Hypothesis</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Target Cargo / Asset Selector */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Target Cargo Shipment</label>
              <select
                value={selectedCargo}
                onChange={(e) => setSelectedCargo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:bg-white"
              >
                {cargoList.length === 0 ? (
                  <option value="MED-024">MED-024 (Medical Supplies)</option>
                ) : (
                  cargoList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.description} ({c.priority})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Delay Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-700 font-bold">Simulated Schedule Delay</label>
                <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  +{delayDuration} hours ({Math.round(delayDuration / 24)} days)
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={168}
                step={12}
                value={delayDuration}
                onChange={(e) => setDelayDuration(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>+12h (Minor)</span>
                <span>+48h (Critical Threshold)</span>
                <span>+7d (Severe Disruption)</span>
              </div>
            </div>

            {/* Consumption Multiplier Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-700 font-bold">Base Consumption Surge Factor</label>
                <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {consumptionMultiplier}x Daily Burn
                </span>
              </div>
              <input
                type="range"
                min={1.0}
                max={2.5}
                step={0.1}
                value={consumptionMultiplier}
                onChange={(e) => setConsumptionMultiplier(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Simulates severe blizzards requiring higher diesel generator draw or emergency medical consumption.
              </p>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRun}
              disabled={isLoading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
            >
              <Zap className="w-4 h-4" />
              <span>{isLoading ? 'Computing Operational Sandbox...' : 'Run Scenario Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Simulation Output & Before/After Delta Canvas */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Simulation Delta & Recommended Action</h3>
              <p className="text-[11px] text-slate-500">
                Isolated sandbox preview • No production database changes until committed
              </p>
            </div>
            {simulationData && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-bold">
                Hypothetical State
              </span>
            )}
          </div>

          {!simulationData ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <SlidersHorizontal className="w-8 h-8 mx-auto text-slate-300" />
              <div className="text-xs font-bold text-slate-700">Ready for Execution</div>
              <div className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Select your disruption parameters on the left and run the simulation to preview risk propagation and automated mitigation recommendations.
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {/* Risk Surge Delta Card */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                    Baseline System Risk
                  </span>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {simulationData.baselineRisk ?? 38}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Normal Operating</span>
                </div>

                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                  <span className="text-rose-700 font-semibold block text-[10px] uppercase">
                    Simulated Disruption Risk
                  </span>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {simulationData.simulatedRisk ?? 71}
                    <span className="text-xs font-normal text-rose-400">/100</span>
                  </div>
                  <span className="text-[10px] text-rose-700 font-bold flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>+{simulationData.riskIncrease ?? 33} Point Surge (CRITICAL)</span>
                  </span>
                </div>
              </div>

              {/* Cascade Impact Description */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-1.5">
                <div className="font-bold text-amber-900 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Downstream Cascade Forecast:</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  {simulationData.impactSummary ||
                    `Delay of ${delayDuration} hours on ${selectedCargo} causes destination station reserves to deplete below safety minimum within 9 days. Cross-station reallocation is required.`}
                </p>
              </div>

              {/* Autonomous Mitigation Recommendation */}
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Decision Support Recommendation</span>
                  </span>
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-mono font-bold">
                    Optimal Mitigation
                  </span>
                </div>

                <p className="text-sky-900 leading-relaxed text-[11px]">
                  {simulationData.recommendedMitigation ||
                    'Dispatch emergency traverse convoy PB-04 from donor base to transfer 150 surplus units, restoring destination buffer to 24 days.'}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white/80 p-2 rounded border border-sky-200">
                    <span className="text-slate-500 block">Post-Mitigation Risk:</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      {simulationData.postMitigationRisk ?? 38} / 100
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-sky-200">
                    <span className="text-slate-500 block">Donor Impact:</span>
                    <span className="font-bold text-slate-800 font-mono text-sm">
                      {simulationData.donorImpact || 'Surplus Remains (>45 days)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  onClick={handleDiscard}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Discard Simulation
                </button>

                <button
                  onClick={handleApplyMitigation}
                  disabled={isApplyingAction || !canExecuteActions}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50"
                  title={
                    canExecuteActions
                      ? 'Commit this mitigation action directly to active operational state'
                      : 'Commander or Admin role required'
                  }
                >
                  <span>{isApplyingAction ? 'Committing...' : 'Apply Mitigation to Live Operations'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

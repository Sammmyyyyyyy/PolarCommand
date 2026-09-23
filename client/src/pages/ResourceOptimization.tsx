import React, { useState } from 'react';
import {
  Sparkles,
  Truck,
  Weight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { optimizeCargoAllocation } from '../services/api';
import { VehicleAllocationPlan } from '../types';

export const ResourceOptimization: React.FC = () => {
  const [selectedVehicle, setSelectedVehicle] = useState('PB-07');
  const [allocationPlan, setAllocationPlan] = useState<VehicleAllocationPlan | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async () => {
    try {
      setIsOptimizing(true);
      const res = await optimizeCargoAllocation(selectedVehicle);
      setAllocationPlan(res);
    } catch (err: any) {
      alert(err.message || 'Error running optimization');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Resource & Cargo Allocation Optimization
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-xs font-bold font-mono">
              Secondary Intelligence Service
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic heuristic algorithm allocating high-priority polar cargo to vehicles under extreme terrain weight constraints
          </p>
        </div>

        <button
          onClick={handleOptimize}
          disabled={isOptimizing}
          className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          <span>{isOptimizing ? 'Computing Optimum...' : 'Run Allocation Optimizer'}</span>
        </button>
      </div>

      {/* Input Parameters Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="font-extrabold text-sm text-slate-900">Vehicle Assignment Parameters</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Target Snow Vehicle</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
            >
              <option value="PB-07">PB-07 (PistenBully 600 Rescue Cab • 6,000 kg Payload)</option>
              <option value="PB-01">PB-01 (PistenBully 600 Standard • 4,500 kg Payload)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Optimization Objective</label>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold">
              Maximize Critical & High-Priority Delivery
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Terrain Constraint</label>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold">
              Fast Ice Crevasse Crossing (Max 6T Limit)
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Plan Result */}
      {allocationPlan ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="font-extrabold text-sm text-slate-900">
                Optimized Loading Manifest for {allocationPlan.vehicleName}
              </div>
              <div className="text-xs text-slate-500">
                Payload capacity: {allocationPlan.capacityKg.toLocaleString()} kg • Assigned:{' '}
                {allocationPlan.assignedWeightKg.toLocaleString()} kg ({allocationPlan.utilizationPercentage}%)
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
              Optimal Allocation Ready
            </span>
          </div>

          {/* Utilization Progress Bar */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-bold text-slate-700">
              <span>Payload Utilization</span>
              <span className="font-mono text-sky-700">{allocationPlan.utilizationPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-sky-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${allocationPlan.utilizationPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Assigned Cargo Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Cargo ID</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Weight (kg)</th>
                  <th className="py-2.5 px-3">Priority Level</th>
                  <th className="py-2.5 px-3">Allocation Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocationPlan.assignedShipments.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-700">{c.id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{c.category}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {c.weightKg.toLocaleString()} kg
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      Priority triage matched with thermal survival cabin
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 bg-white rounded-xl border border-slate-200/90 shadow-2xs text-center space-y-2">
          <Truck className="w-8 h-8 text-sky-600 mx-auto opacity-60" />
          <div className="font-bold text-slate-800 text-xs">Optimization Service Ready</div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Click <strong>Run Allocation Optimizer</strong> to compute the optimal weight pack for vehicle routes across Larsemann fast ice.
          </p>
        </div>
      )}
    </div>
  );
};

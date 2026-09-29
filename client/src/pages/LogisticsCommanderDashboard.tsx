import React from 'react';
import {
  Boxes,
  FileText,
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Compass,
  Layers,
  Sparkles,
  Plane,
  Anchor,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LogisticsCommanderDashboardProps {
  onNavigate?: (path: string) => void;
}

export const LogisticsCommanderDashboard: React.FC<LogisticsCommanderDashboardProps> = ({
  onNavigate,
}) => {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Welcome & Operational Command Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>National Logistics Authority • Polar Operations</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Logistics Command Center
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Welcome, <strong>{currentUser?.name || 'Cmdr. Vikram Malhotra'}</strong>. Oversight of Antarctic supply chains, official tender awards, and multi-stage maritime transit.
          </p>
        </div>

        {/* Primary Actions (Section AN: Priority is decision-making) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/logistics?tab=requirements')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Boxes className="w-4 h-4" />
            <span>Review Requirements</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/logistics?tab=finalized')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Finalize Orders</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/logistics?tab=tracking')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Truck className="w-4 h-4" />
            <span>Track Shipments</span>
          </button>
        </div>
      </div>

      {/* TOP SECTION: Requirements Awaiting Decision (Section AN) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              Requirements Awaiting Decision
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/logistics?tab=requirements')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View Common Pool</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Critical */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Critical Urgency
              </span>
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center">
                1
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900">Generator Cold-Start Filters</div>
            <p className="text-[11px] text-slate-600">
              Bharati Station primary diesel genset backup. AI predicts stockout in <strong>6 days</strong>.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('/logistics?tab=requirements')}
                className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Approve Critical Restock
              </button>
            </div>
          </div>

          {/* High */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                High Urgency
              </span>
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-black flex items-center justify-center">
                2
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900">Field Medical Trauma Kits</div>
            <p className="text-[11px] text-slate-600">
              Maitri Station + Amery Traverse demand consolidation opportunity detected.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('/logistics?tab=requirements')}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Review & Consolidate
              </button>
            </div>
          </div>

          {/* Normal */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Normal Urgency
              </span>
              <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-xs font-black flex items-center justify-center">
                2
              </span>
            </div>
            <div className="text-sm font-extrabold text-slate-900">Aviation Kerosene & Food Stores</div>
            <p className="text-[11px] text-slate-600">
              Scheduled wintering replenishment. Stock buffer safe for 45+ days.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('/logistics?tab=requirements')}
                className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Inspect Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECOND SECTION: Procurement in Progress & Finalized Orders (Section AN) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procurement in Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-extrabold text-slate-900">
                Procurement & Tenders
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Official Portals
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">Polar Medical Consignment Tender</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  Bid Evaluation
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tender: <strong>NCPOR/LOG/MED/2026/042</strong> • Apex Polar Health Systems verified lowest compliant bidder.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">Diesel Genset Spares GeM Contract</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Award Finalized
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                GeM/2026/B/882190 • Kirloskar Polar Engineering Division awarded.
              </p>
            </div>
          </div>
        </div>

        {/* Finalized Orders */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-extrabold text-slate-900">
                Finalized Orders
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/logistics?tab=finalized')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">Consolidated Medical Replenishment</span>
                <span className="font-mono text-emerald-700 font-bold">90 Kits</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Supplier: Apex Polar Health Systems</span>
                <span className="text-slate-800 font-semibold">Ready for Cape Town Staging</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">Generator Heavy Spare Parts</span>
                <span className="font-mono text-emerald-700 font-bold">24 Sets</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Supplier: Kirloskar Polar Engineering</span>
                <span className="text-slate-800 font-semibold">Loading on MV Polar Queen</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THIRD SECTION: Tracking Ongoing Orders, Shipment Delays & Upcoming Deliveries (Section AN) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              Active Shipments & Corridor Status
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/live-map')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Live Polar Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shipment 1: Nominal Vessel */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Anchor className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs text-slate-900">MV Polar Queen</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                On Schedule
              </span>
            </div>

            <div className="text-xs font-bold text-slate-800">
              Scientific Equipment & Core Drill Consignment
            </div>

            <div className="text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Current Stage:</span>
                <strong className="text-slate-900">Southern Ocean Maritime Transit</strong>
              </div>
              <div className="flex justify-between">
                <span>Destination:</span>
                <span className="text-slate-900 font-semibold">Bharati Station</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Arrival:</span>
                <strong className="text-blue-700">18 October</strong>
              </div>
            </div>
          </div>

          {/* Shipment 2: Delayed Polar Air Cargo */}
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plane className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-xs text-slate-900">DROMLAN Polar Air Corridor</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                Delayed (+48h)
              </span>
            </div>

            <div className="text-xs font-bold text-slate-800">
              Medical Supplies & Cold-Weather Spares
            </div>

            <div className="text-[11px] text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Current Stage:</span>
                <strong className="text-slate-900">Cape Town International Airbase</strong>
              </div>
              <div className="flex justify-between">
                <span>Destination:</span>
                <span className="text-slate-900 font-semibold">Maitri Station</span>
              </div>
              <div className="flex justify-between">
                <span>Adjusted ETA:</span>
                <strong className="text-amber-800">23 October</strong>
              </div>
            </div>

            <div className="p-2 bg-white/90 rounded border border-amber-200 text-[11px] text-rose-800 font-medium">
              ⚠ <strong>Impact:</strong> Maitri medical stock hits safety threshold on 21 October. Emergency air sortie standby requested.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

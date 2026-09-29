import React from 'react';
import {
  Building2,
  Mountain,
  Home,
  Anchor,
  Flag,
  Navigation,
  CheckCircle2,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { ExpeditionRouteStep } from '../../types';

interface ExpeditionRouteProps {
  steps?: ExpeditionRouteStep[];
  compact?: boolean;
}

export const ExpeditionRoute: React.FC<ExpeditionRouteProps> = ({
  steps = [],
  compact = false,
}) => {
  if (!steps || steps.length === 0) {
    return null;
  }

  // Choose appropriate icon for each step type
  const getStepIcon = (step: ExpeditionRouteStep) => {
    const t = (step.type || '').toLowerCase();
    const n = (step.name || '').toLowerCase();

    if (t === 'station' || n.includes('station') || n.includes('base') || n.includes('depot')) {
      return Building2;
    }
    if (t === 'berth' || t === 'vessel' || n.includes('vessel') || n.includes('berth') || n.includes('port')) {
      return Anchor;
    }
    if (t === 'research' || n.includes('site') || n.includes('borehole') || n.includes('zone')) {
      return Mountain;
    }
    if (t === 'return' || n.includes('return')) {
      return Home;
    }
    if (t === 'transit' || n.includes('transit') || n.includes('traverse') || n.includes('convoy')) {
      return Navigation;
    }
    return Flag;
  };

  if (compact) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between relative px-1">
          {/* Connecting Line (Dashed Vector) */}
          <div className="absolute left-6 right-6 top-3 h-0.5 border-t-2 border-dashed border-sky-200 z-0"></div>

          {steps.map((step, idx) => {
            const Icon = getStepIcon(step);
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';

            return (
              <div
                key={step.id || idx}
                className="relative z-10 flex flex-col items-center text-center flex-1"
                title={`${step.name} (${step.status})`}
              >
                {/* Node Circle */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    isCurrent
                      ? 'bg-[#0284C7] text-white ring-4 ring-sky-100 shadow-xs scale-110 font-bold'
                      : isCompleted
                      ? 'bg-sky-100 text-sky-700 border border-sky-300'
                      : 'bg-white border border-slate-300 text-slate-400'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                </div>

                {/* Step Label */}
                <span
                  className={`text-[10px] mt-1.5 max-w-[68px] truncate leading-tight transition-colors ${
                    isCurrent
                      ? 'font-bold text-[#0284C7]'
                      : isCompleted
                      ? 'font-semibold text-slate-700'
                      : 'font-normal text-slate-400'
                  }`}
                >
                  {step.name}
                </span>

                {/* Status indicator dot */}
                <div className="mt-0.5">
                  {isCurrent && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Detailed mode for Expedition Details page
  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:border-l-2 before:border-dashed before:border-sky-200">
      {steps.map((step, idx) => {
        const Icon = getStepIcon(step);
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';

        return (
          <div key={step.id || idx} className="relative flex items-start space-x-3.5 group">
            {/* Timeline Node Badge */}
            <div
              className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                isCurrent
                  ? 'bg-[#0284C7] text-white ring-4 ring-sky-100 shadow-md scale-110'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-300'
                  : 'bg-white border border-slate-300 text-slate-400'
              }`}
            >
              {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
            </div>

            {/* Step Content */}
            <div className="flex-1 bg-slate-50/80 rounded-xl p-3 border border-slate-100 hover:border-sky-200 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-slate-900">{step.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isCurrent
                        ? 'bg-sky-100 text-sky-700'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
                {step.etaOrDate && (
                  <span className="text-[11px] font-semibold text-slate-500">{step.etaOrDate}</span>
                )}
              </div>

              {step.description && (
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{step.description}</p>
              )}

              {step.latitude !== undefined && step.longitude !== undefined && (
                <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center space-x-2">
                  <span>GPS: {step.latitude.toFixed(3)}°, {step.longitude.toFixed(3)}°</span>
                  <span>• Type: {step.type}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

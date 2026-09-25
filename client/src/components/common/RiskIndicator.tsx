import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface RiskContributor {
  factor: string;
  points: number;
}

interface RiskIndicatorProps {
  score: number;
  level?: string;
  contributors?: RiskContributor[];
  showBreakdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  score,
  level,
  contributors = [],
  showBreakdown = true,
  size = 'md',
  className = '',
}) => {
  const computedLevel = level || (
    score >= 75 ? 'CRITICAL' :
    score >= 60 ? 'HIGH' :
    score >= 40 ? 'MEDIUM' : 'LOW'
  );

  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let barColor = 'bg-emerald-500';
  let Icon = CheckCircle2;

  if (computedLevel === 'CRITICAL') {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    barColor = 'bg-rose-600';
    Icon = ShieldAlert;
  } else if (computedLevel === 'HIGH') {
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    barColor = 'bg-amber-500';
    Icon = AlertTriangle;
  } else if (computedLevel === 'MEDIUM') {
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
    barColor = 'bg-blue-500';
    Icon = Info;
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${badgeColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Expedition Operational Risk
            </div>
            <div className="text-xs font-bold text-[#0A192F]">
              {computedLevel} RISK
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {score}
          </span>
          <span className="text-xs text-slate-400 font-medium">/100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
        />
      </div>

      {/* Contributing Factors Breakdown */}
      {showBreakdown && contributors.length > 0 && (
        <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Contributing Factors:
          </div>
          {contributors.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium truncate pr-2">{c.factor}</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[10px]">
                +{c.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: {
    text: string;
    isPositive?: boolean;
    isWarning?: boolean;
  };
  variant?: 'default' | 'primary' | 'warning' | 'critical' | 'success';
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  variant = 'default',
  onClick,
  className = '',
}) => {
  let iconBg = 'bg-sky-50 text-sky-700 border-sky-100';
  let accentBorder = 'border-slate-200';

  if (variant === 'primary') {
    iconBg = 'bg-sky-100 text-sky-700 border-sky-200';
    accentBorder = 'border-sky-300';
  } else if (variant === 'warning') {
    iconBg = 'bg-amber-50 text-amber-700 border-amber-200';
    accentBorder = 'border-amber-300';
  } else if (variant === 'critical') {
    iconBg = 'bg-rose-50 text-rose-700 border-rose-200';
    accentBorder = 'border-rose-300';
  } else if (variant === 'success') {
    iconBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    accentBorder = 'border-emerald-300';
  }

  const isInteractive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-4 shadow-2xs transition-all ${accentBorder} ${
        isInteractive ? 'hover:border-sky-400 hover:shadow-xs cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
          {value}
        </div>
        {subValue && (
          <span className="text-xs text-slate-400 font-medium">{subValue}</span>
        )}
      </div>

      {trend && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold text-[11px] ${
              trend.isWarning
                ? 'text-rose-600'
                : trend.isPositive
                ? 'text-emerald-600'
                : 'text-slate-500'
            }`}
          >
            {trend.text}
          </span>
        </div>
      )}
    </div>
  );
};

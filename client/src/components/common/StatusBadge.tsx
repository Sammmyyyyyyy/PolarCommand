import React from 'react';

export type OperationalStatus = 
  | 'PLANNED' | 'READY' | 'IN_TRANSIT' | 'DELAYED' | 'ARRIVED' | 'CANCELLED'
  | 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'DECOMMISSIONED' | 'OPERATIONAL'
  | 'DELIVERED' | 'DAMAGED' | 'LOST' | 'PACKED' | 'LOADED' | 'AT_HUB' | 'AT_STATION'
  | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL'
  | 'OPEN' | 'CAUTION' | 'RESTRICTED' | 'PROHIBITED'
  | 'LIVE' | 'STALE' | 'OFFLINE' | 'CONNECTED'
  | 'PENDING' | 'RESOLVED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  | string;

interface StatusBadgeProps {
  status: OperationalStatus;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const norm = (status || '').toUpperCase().trim();

  // Deterministic, restrained semantic styling in light daylight mode
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (['CRITICAL', 'DAMAGED', 'PROHIBITED', 'BLOCKED', 'LOST'].includes(norm)) {
    colorStyles = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (['HIGH', 'DELAYED', 'RESTRICTED', 'CAUTION', 'STALE'].includes(norm)) {
    colorStyles = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (['NORMAL', 'AVAILABLE', 'READY', 'ARRIVED', 'DELIVERED', 'COMPLETED', 'RESOLVED', 'LIVE', 'CONNECTED', 'OPERATIONAL', 'OPEN'].includes(norm)) {
    colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (['IN_TRANSIT', 'IN_PROGRESS', 'ASSIGNED', 'PLANNED'].includes(norm)) {
    colorStyles = 'bg-sky-50 text-sky-700 border-sky-200';
    dotColor = 'bg-sky-500';
  } else if (['MEDIUM', 'IN_MAINTENANCE', 'PACKED', 'LOADED'].includes(norm)) {
    colorStyles = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  }

  const sizeStyles = size === 'sm' 
    ? 'px-1.5 py-0.5 text-[10px]' 
    : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-semibold border ${sizeStyles} ${colorStyles} ${className} tracking-wide`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${
          pulse || norm === 'LIVE' || norm === 'CRITICAL' ? 'animate-pulse' : ''
        }`}
      />
      <span className="font-mono text-[10px] uppercase font-bold">{status}</span>
    </span>
  );
};

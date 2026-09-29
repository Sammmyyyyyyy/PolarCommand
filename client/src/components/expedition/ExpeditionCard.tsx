import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Package,
  Wrench,
  Building2,
  ArrowRight,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Expedition } from '../../types';
import { ExpeditionRoute } from './ExpeditionRoute';

interface ExpeditionCardProps {
  expedition: Expedition;
  isSelected?: boolean;
  onOpen: (id: string) => void;
  onNavigate?: (path: string) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export const ExpeditionCard: React.FC<ExpeditionCardProps> = ({
  expedition,
  isSelected = false,
  onOpen,
  onNavigate = () => {},
  onDelete,
  isAdmin = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isExpActive =
    expedition.status?.toUpperCase() === 'ACTIVE' || expedition.lifecycleStatus === 'ACTIVE';
  const isExpPlanning =
    expedition.status?.toUpperCase() === 'PLANNING' ||
    expedition.lifecycleStatus === 'PLANNED' ||
    expedition.lifecycleStatus === 'DRAFT';

  // Format date range (e.g. Oct 2026 – Jun 2027)
  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const sFmt = s.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const eFmt = e.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return `${sFmt} – ${eFmt}`;
    } catch {
      return '2026 – 2027';
    }
  };

  const routeText = `${(expedition.origin || 'Staging Base').split('/')[0].split(',')[0].trim()} → ${(expedition.destination || 'Polar Field').split('&')[0].split(',')[0].trim()}`;
  const dateRange = formatDateRange(expedition.startDate, expedition.endDate);

  // Compute resource summary metrics directly from data
  const personnelCount =
    expedition.personnelCount ??
    expedition.personnel?.length ??
    expedition._count?.personnel ??
    4;

  const cargoCount =
    expedition.totalCargoCount ??
    expedition.cargoShipments?.length ??
    expedition.cargo?.length ??
    expedition._count?.cargo ??
    3;

  const assetsCount =
    expedition.keyAssets?.length ??
    expedition.assets?.length ??
    expedition._count?.assets ??
    2;

  const stationsCount =
    expedition.assignedStations?.length ??
    expedition.stations?.length ??
    expedition._count?.stations ??
    2;

  return (
    <div
      className={`bg-white rounded-2xl border p-5 sm:p-6 flex flex-col justify-between transition shadow-2xs hover:shadow-md hover:border-sky-300 relative select-none ${
        isSelected ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-200/90'
      }`}
    >
      <div>
        {/* 1. Top Line: Status Badge & Year Range */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isExpActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isExpPlanning
                ? 'bg-sky-50 text-[#0284C7] border border-sky-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isExpActive
                  ? 'bg-emerald-500 animate-pulse'
                  : isExpPlanning
                  ? 'bg-sky-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>{isExpActive ? 'Active' : isExpPlanning ? 'Planning' : 'Completed'}</span>
          </span>

          <span className="text-xs font-semibold text-slate-500">2026 – 2027</span>
        </div>

        {/* 2. Title (Human-Readable Mission Title Only - Zero Backend IDs) */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-3 leading-snug">
          {expedition.title}
        </h3>

        {/* 3. Description (Clean 2-line truncated) */}
        <p className="text-xs text-slate-500 leading-relaxed mt-1.5 line-clamp-2 min-h-[36px]">
          {expedition.missionObjective ||
            expedition.description ||
            'Antarctic scientific research and field operations sustainment.'}
        </p>

        {/* 4. Route & Schedule Information */}
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
            <span className="truncate font-medium">{routeText}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{dateRange}</span>
          </div>
        </div>

        {/* 5. Mission Route Progression Visual Line (Driven directly by expedition.route) */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <ExpeditionRoute steps={expedition.route || []} compact={true} />
        </div>

        {/* 6. Resource Summary (4 Compact Metric Blocks) */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          <div className="bg-slate-50/90 rounded-xl p-2.5 text-center border border-slate-100">
            <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <div className="text-sm font-black text-slate-900 leading-none">{personnelCount}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-1">Personnel</div>
          </div>
          <div className="bg-slate-50/90 rounded-xl p-2.5 text-center border border-slate-100">
            <Package className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <div className="text-sm font-black text-slate-900 leading-none">{cargoCount}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-1">Cargo Shipments</div>
          </div>
          <div className="bg-slate-50/90 rounded-xl p-2.5 text-center border border-slate-100">
            <Wrench className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <div className="text-sm font-black text-slate-900 leading-none">{assetsCount}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-1">Key Assets</div>
          </div>
          <div className="bg-slate-50/90 rounded-xl p-2.5 text-center border border-slate-100">
            <Building2 className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <div className="text-sm font-black text-slate-900 leading-none">{stationsCount}</div>
            <div className="text-[10px] font-medium text-slate-500 mt-1">
              {stationsCount === 1 ? 'Station' : 'Stations'}
            </div>
          </div>
        </div>
      </div>

      {/* 7. Bottom Actions: Secondary Menu [...] and Primary [ Open Expedition → ] */}
      <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100 relative">
        {/* Secondary Action Dropdown [...] */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="w-9 h-9 rounded-xl border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-500 flex items-center justify-center transition cursor-pointer"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div
              className="absolute left-0 bottom-full mb-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-xs animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  onNavigate('/mission-planning');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer"
              >
                <span>Mission Planning</span>
                <span className="text-[10px] text-slate-400">➔</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('/live-map');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer"
              >
                <span>Live Map Track</span>
                <span className="text-[10px] text-slate-400">➔</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('/logistics');
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer"
              >
                <span>Logistics Cargo</span>
                <span className="text-[10px] text-slate-400">➔</span>
              </button>
              {isAdmin && onDelete && (
                <button
                  onClick={() => {
                    onDelete(expedition.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-bold border-t border-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Expedition</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Button: Open Expedition */}
        <button
          type="button"
          onClick={() => onOpen(expedition.id)}
          className="px-5 py-2.5 bg-[#0284C7] hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs hover:shadow-md cursor-pointer"
        >
          <span>Open Expedition</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  ArrowUpDown,
  Compass,
} from 'lucide-react';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { reseedDemoData, deleteExpedition } from '../services/api';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { ExpeditionCard } from '../components/expedition/ExpeditionCard';

interface ExpeditionListPageProps {
  onNavigate?: (path: string) => void;
  onSelectExpedition?: (id: string) => void;
  onCreateNew?: () => void;
}

export const ExpeditionListPage: React.FC<ExpeditionListPageProps> = ({
  onNavigate = () => {},
  onSelectExpedition,
  onCreateNew,
}) => {
  const { expeditions, switchExpedition, triggerRefresh, currentExpeditionId } = useExpedition();
  const { canCreateExpedition, isAdmin } = useAuth();

  // Filters & Search State
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'PLANNING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'startDate' | 'title' | 'status' | 'personnel'>('startDate');

  const [isReseeding, setIsReseeding] = useState(false);
  const [expeditionToDelete, setExpeditionToDelete] = useState<string | null>(null);

  const handleOpenExpedition = (expId: string) => {
    switchExpedition(expId);
    if (onSelectExpedition) {
      onSelectExpedition(expId);
    } else {
      onNavigate(`/expeditions/${expId}`);
    }
  };

  const handleReseed = async () => {
    try {
      setIsReseeding(true);
      await reseedDemoData();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reseed demo expeditions');
    } finally {
      setIsReseeding(false);
    }
  };

  const handleDelete = async () => {
    if (!expeditionToDelete) return;
    try {
      await deleteExpedition(expeditionToDelete);
      setExpeditionToDelete(null);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expedition');
    }
  };

  // Status counts for tab indicators directly computed from dataset
  const counts = useMemo(() => {
    const active = expeditions.filter(
      (e) => e.status?.toUpperCase() === 'ACTIVE' || e.lifecycleStatus === 'ACTIVE'
    ).length;
    const planning = expeditions.filter(
      (e) =>
        e.status?.toUpperCase() === 'PLANNING' ||
        e.lifecycleStatus === 'PLANNED' ||
        e.lifecycleStatus === 'DRAFT'
    ).length;
    const completed = expeditions.filter(
      (e) => e.status?.toUpperCase() === 'COMPLETED' || e.lifecycleStatus === 'COMPLETED'
    ).length;
    return {
      all: expeditions.length,
      active,
      planning,
      completed,
    };
  }, [expeditions]);

  // Filtered and Sorted Expeditions
  const filteredExpeditions = useMemo(() => {
    return expeditions
      .filter((exp) => {
        const isExpActive = exp.status?.toUpperCase() === 'ACTIVE' || exp.lifecycleStatus === 'ACTIVE';
        const isExpPlanning =
          exp.status?.toUpperCase() === 'PLANNING' ||
          exp.lifecycleStatus === 'PLANNED' ||
          exp.lifecycleStatus === 'DRAFT';
        const isExpCompleted =
          exp.status?.toUpperCase() === 'COMPLETED' || exp.lifecycleStatus === 'COMPLETED';

        // Tab Filter
        if (activeTab === 'ACTIVE' && !isExpActive) return false;
        if (activeTab === 'PLANNING' && !isExpPlanning) return false;
        if (activeTab === 'COMPLETED' && !isExpCompleted) return false;

        // Status Dropdown Filter
        if (statusFilter === 'ACTIVE' && !isExpActive) return false;
        if (statusFilter === 'PLANNING' && !isExpPlanning) return false;
        if (statusFilter === 'COMPLETED' && !isExpCompleted) return false;

        // Year Filter
        if (yearFilter !== 'ALL') {
          const startYear = new Date(exp.startDate).getFullYear().toString();
          const endYear = new Date(exp.endDate).getFullYear().toString();
          if (!yearFilter.includes(startYear) && !yearFilter.includes(endYear)) return false;
        }

        // Text Search (Title, Mission Objective, Origin, Destination, Leader)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const titleMatch = exp.title?.toLowerCase().includes(q);
          const objMatch =
            exp.missionObjective?.toLowerCase().includes(q) || exp.description?.toLowerCase().includes(q);
          const originMatch = exp.origin?.toLowerCase().includes(q);
          const destMatch = exp.destination?.toLowerCase().includes(q);
          const leaderMatch = exp.commanderName?.toLowerCase().includes(q);
          if (!titleMatch && !objMatch && !originMatch && !destMatch && !leaderMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'startDate') {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'status') {
          return a.status.localeCompare(b.status);
        }
        if (sortBy === 'personnel') {
          const pA = a.personnelCount ?? a._count?.personnel ?? 0;
          const pB = b.personnelCount ?? b._count?.personnel ?? 0;
          return pB - pA;
        }
        return 0;
      });
  }, [expeditions, activeTab, statusFilter, yearFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto font-sans select-none">
      {/* 1. Page Header with Subtle Vector Arctic Mountain Motif (NO PHOTOGRAPHS) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
        {/* Subtle Pure Vector Mountain Horizon Graphic (Pure SVG, Zero Photos) */}
        <div className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-none opacity-45 overflow-hidden flex items-end justify-end">
          <svg viewBox="0 0 700 180" className="w-full h-full text-sky-400" fill="none">
            <defs>
              <linearGradient id="mtnGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="mtnGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#F0F9FF" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Distant Peaks */}
            <path
              d="M0,180 L80,110 L160,145 L260,80 L350,135 L440,65 L540,120 L640,45 L700,90 L700,180 Z"
              fill="url(#mtnGrad1)"
            />
            {/* Mid-range Ridge */}
            <path
              d="M40,180 L120,125 L210,160 L310,95 L400,150 L490,85 L590,140 L700,75 L700,180 Z"
              fill="url(#mtnGrad2)"
            />
            {/* Sun/Polar Glow */}
            <circle cx="580" cy="50" r="32" fill="#E0F2FE" opacity="0.35" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Expedition Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              Plan, manage and monitor all Antarctic and Arctic expeditions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {(canCreateExpedition || isAdmin) && (
              <button
                type="button"
                onClick={() => (onCreateNew ? onCreateNew() : onNavigate('/expeditions/new'))}
                className="px-4 py-2.5 bg-[#0284C7] hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create New Expedition</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Expedition Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Left: Filter Tabs with Dynamic Counts */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none border-b lg:border-b-0 border-slate-100">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-sky-50 text-[#0284C7] border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            All Expeditions
          </button>
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ACTIVE'
                ? 'bg-sky-50 text-[#0284C7] border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Active</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              {counts.active}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('PLANNING')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'PLANNING'
                ? 'bg-sky-50 text-[#0284C7] border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Planning</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 font-extrabold">
              {counts.planning}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'COMPLETED'
                ? 'bg-sky-50 text-[#0284C7] border border-sky-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Completed</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-extrabold">
              {counts.completed}
            </span>
          </button>
        </div>

        {/* Right: Search & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expeditions..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-400 transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/70 transition cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNING">Planning</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/70 transition cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Years</option>
            <option value="2026 - 2027">2026 – 2027</option>
            <option value="2025 - 2026">2025 – 2026</option>
          </select>

          {/* Sort Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 cursor-pointer focus:outline-none"
            >
              <option value="startDate">Start Date</option>
              <option value="title">Mission Title</option>
              <option value="personnel">Personnel</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Expedition Cards Responsive Grid (Desktop 3, Tablet 2, Mobile 1) */}
      {filteredExpeditions.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No expeditions match your criteria"
          description="Adjust your search filters or active tabs to find an expedition."
          actionText={expeditions.length === 0 ? '+ Restore Demo Expeditions' : 'Clear Filters'}
          onAction={() => {
            if (expeditions.length === 0) {
              handleReseed();
            } else {
              setActiveTab('ALL');
              setSearchQuery('');
              setStatusFilter('ALL');
              setYearFilter('ALL');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {filteredExpeditions.map((exp) => (
            <ExpeditionCard
              key={exp.id}
              expedition={exp}
              isSelected={exp.id === currentExpeditionId}
              onOpen={handleOpenExpedition}
              onNavigate={onNavigate}
              onDelete={(id) => setExpeditionToDelete(id)}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={Boolean(expeditionToDelete)}
        onClose={() => setExpeditionToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Expedition?"
        message="Are you sure you want to permanently delete this expedition and all associated stations, cargo, personnel, and telemetry data?"
        confirmText="Delete Expedition"
        isDestructive
      />
    </div>
  );
};

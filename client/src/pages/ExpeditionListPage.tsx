import React, { useState } from 'react';
import {
  Compass,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  MapPin,
  Users,
  Package,
  Truck,
  RotateCcw,
  Sparkles,
  Trash2,
  Boxes,
} from 'lucide-react';
import { useExpedition } from '../context/ExpeditionContext';
import { reseedDemoData, deleteExpedition } from '../services/api';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';

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
  const [isReseeding, setIsReseeding] = useState(false);
  const [expeditionToDelete, setExpeditionToDelete] = useState<string | null>(null);

  const handleOpenExpedition = (expId: string) => {
    if (onSelectExpedition) {
      onSelectExpedition(expId);
    } else {
      switchExpedition(expId);
      onNavigate('/dashboard');
    }
  };

  const handleReseed = async () => {
    try {
      setIsReseeding(true);
      await reseedDemoData();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reseed demo expedition');
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Expedition Hub</h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-mono font-bold border border-sky-200">
              {expeditions.length} Expeditions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mission control portfolio for multi-year Antarctic and Arctic science expeditions
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReseed}
            disabled={isReseeding}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin' : ''}`} />
            <span>{isReseeding ? 'Restoring Seed...' : 'Load / Reset Demo (INPEX-2027)'}</span>
          </button>
          <button
            onClick={() => (onCreateNew ? onCreateNew() : onNavigate('/expeditions/new'))}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Expedition</span>
          </button>
        </div>
      </div>

      {/* Expeditions Grid or Empty State */}
      {expeditions.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No expeditions yet"
          description="Create your first polar expedition from scratch to begin managing personnel, cargo, inventory, assets, and operational decisions."
          actionText="+ Create Your First Expedition"
          onAction={() => onNavigate('/expeditions/new')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {expeditions.map((exp) => {
            const isActiveSelection = exp.id === currentExpeditionId;
            const isHighRisk = exp.overallRiskScore > 60;
            const isWarningRisk = exp.overallRiskScore > 40 && !isHighRisk;

            return (
              <div
                key={exp.id}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition shadow-2xs hover:shadow-md ${
                  isActiveSelection
                    ? 'border-sky-500 ring-2 ring-sky-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top line: Code, Active tag, Risk Pill */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {exp.code}
                      </span>
                      {isActiveSelection && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                          Active Selection
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          exp.status === 'ACTIVE' || exp.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {exp.status}
                      </span>
                      <div
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          isHighRisk
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isWarningRisk
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                      >
                        Risk: {exp.overallRiskScore}/100
                      </div>
                    </div>
                  </div>

                  {/* Title & Objective */}
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-1">
                      {exp.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {exp.missionObjective}
                    </p>
                  </div>

                  {/* Route & Dates */}
                  <div className="text-[11px] text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">{exp.origin} ➔ {exp.destination}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {new Date(exp.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} –{' '}
                        {new Date(exp.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Entity Metrics Pill Strip */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 rounded-lg p-1.5">
                      <div className="text-[10px] text-slate-400">Personnel</div>
                      <div className="text-xs font-bold text-slate-900">{exp._count?.personnel ?? 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5">
                      <div className="text-[10px] text-slate-400">Cargo</div>
                      <div className="text-xs font-bold text-slate-900">{exp._count?.cargo ?? 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5">
                      <div className="text-[10px] text-slate-400">Assets</div>
                      <div className="text-xs font-bold text-slate-900">{exp._count?.assets ?? 0}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5">
                      <div className="text-[10px] text-slate-400">Stations</div>
                      <div className="text-xs font-bold text-slate-900">{exp.stations?.length ?? 0}</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => setExpeditionToDelete(exp.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Expedition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenExpedition(exp.id)}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    <span>Open Expedition</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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

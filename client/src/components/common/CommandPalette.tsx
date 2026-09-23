import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Package,
  Users,
  Building2,
  Truck,
  ShieldAlert,
  Compass,
  ArrowRight,
  SlidersHorizontal,
  Bell,
  BarChart3,
  X,
} from 'lucide-react';
import { useExpedition } from '../../context/ExpeditionContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const { expeditions, switchExpedition, dashboard } = useExpedition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickPages = [
    { label: 'Command Center', path: '/dashboard', icon: Compass, category: 'Navigation' },
    { label: 'Cargo Tracking Manifest', path: '/cargo', icon: Package, category: 'Navigation' },
    { label: 'Inventory Intelligence', path: '/inventory', icon: Package, category: 'Navigation' },
    { label: 'Personnel & On-Ice Movement', path: '/personnel', icon: Users, category: 'Navigation' },
    { label: 'Asset Management & Machinery', path: '/assets', icon: Truck, category: 'Navigation' },
    { label: 'Transit Corridors & Movements', path: '/movements', icon: Truck, category: 'Navigation' },
    { label: 'Emergency Protocol', path: '/emergency', icon: ShieldAlert, category: 'Navigation' },
    { label: 'What-If Simulation Sandbox', path: '/simulations', icon: SlidersHorizontal, category: 'Navigation' },
    { label: 'Alerts & Decision Actions', path: '/alerts', icon: Bell, category: 'Navigation' },
    { label: 'Analytics & Risk Telemetry', path: '/analytics', icon: BarChart3, category: 'Navigation' },
    { label: 'Expedition Hub (All Expeditions)', path: '/expeditions', icon: Compass, category: 'Expeditions' },
  ];

  const matchedPages = quickPages.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()));

  const matchedExpeditions = expeditions.filter(
    (e) => e.code.toLowerCase().includes(query.toLowerCase()) || e.title.toLowerCase().includes(query.toLowerCase())
  );

  const matchedStations = (dashboard?.stations || []).filter(
    (s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.code.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectPage = (path: string) => {
    onNavigate(path);
    onClose();
  };

  const handleSelectExpedition = (expId: string) => {
    switchExpedition(expId);
    onNavigate('/dashboard');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands, cargo, personnel, expeditions, or stations... (Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-4 flex-1 divide-y divide-slate-100">
          {/* Expeditions Section */}
          {matchedExpeditions.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                Expeditions
              </div>
              {matchedExpeditions.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleSelectExpedition(e.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-sky-50 text-slate-700 hover:text-sky-900 group transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                        <span>{e.code}</span>
                        <span className="text-[10px] font-normal text-slate-500">({e.title})</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{e.origin} ➔ {e.destination}</div>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-sky-600 opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                    <span>Switch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Stations Section */}
          {matchedStations.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                Polar Stations
              </div>
              {matchedStations.map((st) => (
                <button
                  key={st.id}
                  onClick={() => handleSelectPage('/stations')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{st.name}</div>
                      <div className="text-[10px] text-slate-400">{st.region} • Risk: {st.currentRisk}/100</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation Commands */}
          <div className="pt-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
              Modules & Decision Tools
            </div>
            {matchedPages.map((page) => {
              const Icon = page.icon;
              return (
                <button
                  key={page.path}
                  onClick={() => handleSelectPage(page.path)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-sky-100 group-hover:text-sky-600 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-800">{page.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Jump</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Navigation Shortcuts</span>
          <span>Press ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};

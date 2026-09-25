import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ShieldCheck, Radio, Navigation, CheckCircle2, ArrowRight } from 'lucide-react';

interface OverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterApp: () => void;
}

export const OverviewModal: React.FC<OverviewModalProps> = ({ isOpen, onClose, onEnterApp }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0B1B35]/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-3xl bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_25px_70px_rgba(11,27,53,0.35)] overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#1769E0] text-white flex items-center justify-center">
                  <Play className="w-4 h-4 fill-white" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#0B1B35]">Polar Command Operations Overview</h3>
                  <p className="text-xs text-slate-500">2-Minute Operational Walkthrough & Platform Architecture</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video / Interactive Simulation Stage */}
            <div className="p-6 space-y-6">
              <div className="relative rounded-xl overflow-hidden aspect-video bg-[#071326] border border-slate-800 shadow-inner flex flex-col justify-between p-6">
                {/* Simulated Polar Grid Radar */}
                <div className="absolute inset-0 bg-polar-grid opacity-30 pointer-events-none" />
                <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-sky-950/80 border border-sky-400/40 text-[11px] font-mono font-semibold text-sky-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    SIMULATED MISSION TELEMETRY &bull; ANTARCTIC TRANSECT
                  </span>
                  <span className="text-xs font-mono text-slate-400">LAT -78.223&deg; / LON 163.504&deg;</span>
                </div>

                {/* Central Mission Pulse Graphic */}
                <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#1769E0]/20 border border-[#1769E0]/60 flex items-center justify-center text-[#1769E0] shadow-lg shadow-blue-500/20">
                    <Radio className="w-8 h-8 text-sky-400 animate-pulse" />
                  </div>
                  <h4 className="text-xl font-bold text-white tracking-tight">Mission Control Synchronized</h4>
                  <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                    Connecting 12 active field personnel, 8 cargo units, and autonomous weather stations across 1,000 km of polar terrain with zero unmonitored dead zones.
                  </p>
                </div>

                <div className="relative z-10 grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Navigation className="w-4 h-4 text-sky-400" />
                    <span>Real-time GPS Tracking</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Automated Safety Protocols</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>Deterministic Decisions</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  Ready to test the live platform with real expedition data?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onEnterApp();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#1769E0] hover:bg-[#1358BD] text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
                  >
                    <span>Launch Command Center</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

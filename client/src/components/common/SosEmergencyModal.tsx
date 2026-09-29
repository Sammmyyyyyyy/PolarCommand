import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  MapPin,
  Battery,
  Users,
  Building2,
  X,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useExpedition } from '../../context/ExpeditionContext';
import { triggerEmergencySos } from '../../services/api';

interface SosEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SosEmergencyModal: React.FC<SosEmergencyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, currentRole } = useAuth();
  const { currentExpedition, currentExpeditionId } = useExpedition();

  const [message, setMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSent, setIsSent] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (isCountingDown && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (isCountingDown && countdown === 0) {
      // Countdown completed, trigger emergency transmission
      executeSosTransmission();
    }
    return () => clearTimeout(timer);
  }, [isCountingDown, countdown]);

  if (!isOpen) return null;

  const handleStartCountdown = () => {
    setIsCountingDown(true);
    setCountdown(3);
    setErrorMessage(null);
  };

  const handleCancelCountdown = () => {
    setIsCountingDown(false);
    setCountdown(3);
  };

  const executeSosTransmission = async () => {
    setIsSubmitting(true);
    try {
      const expId = currentExpeditionId || 'exp1';
      await triggerEmergencySos(expId, {
        message: message.trim() || `Urgent field emergency reported by ${currentUser?.name || 'Rahul Sharma'}. Assistance required immediately.`,
        location: 'Amery Ice Shelf Traverse - Waypoint 3',
        latitude: -70.21,
        longitude: 74.85,
      });

      setIsSent(true);
      setIsCountingDown(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch SOS signal.');
      setIsCountingDown(false);
      setCountdown(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-rose-500 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center ring-4 ring-rose-50">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-widest text-rose-600 uppercase">
                EMERGENCY DISTRESS BEACON
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Raise Operational SOS
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSent ? (
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <div className="text-lg font-black text-emerald-950">
              SOS Broadcast Confirmed
            </div>
            <p className="text-xs text-emerald-800 font-medium">
              High-priority distress telemetry transmitted to Station Manager and Organization Admin. Emergency coordinators are monitoring coordinates on the Live Map.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Return to Operations
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Current Telemetry Snapshot (Section M) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Automated Emergency Metadata
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                <div>
                  <span className="text-slate-400 text-[11px]">Reporting Person:</span>
                  <div className="font-bold text-slate-900">{currentUser?.name || 'Rahul Sharma'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Current Mission:</span>
                  <div className="font-bold text-slate-900">
                    {currentExpedition?.title || 'Amery Ice Shelf Survey'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Station Base:</span>
                  <div className="font-semibold text-slate-900">Bharati Station</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Device Status:</span>
                  <div className="font-semibold text-emerald-700 flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5" /> 74% • Connected
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Distress Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Emergency Situation Description (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="State nature of emergency (e.g. vehicle mechanical failure, severe blizzard whiteout, medical support required)..."
                rows={3}
                disabled={isCountingDown || isSubmitting}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Countdown Confirmation Area */}
            {isCountingDown ? (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-center space-y-3">
                <div className="text-3xl font-black text-rose-600 animate-bounce">
                  {countdown}
                </div>
                <div className="text-xs font-bold text-rose-900">
                  Broadcasting SOS in {countdown} seconds...
                </div>
                <p className="text-[11px] text-slate-500">
                  Click Cancel below if this was an accidental trigger.
                </p>
                <button
                  type="button"
                  onClick={handleCancelCountdown}
                  className="px-5 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  Cancel Emergency
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartCountdown}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-black tracking-wide shadow-lg shadow-rose-900/20 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>TRANSMIT SOS / EMERGENCY BEACON</span>
                </button>
                <div className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                  3-second countdown will initiate before dispatching to Station Command and Admin.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

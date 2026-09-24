import React, { useState } from 'react';
import {
  CloudSnow,
  Wind,
  Eye,
  Thermometer,
  Compass,
  AlertTriangle,
  RotateCw,
  CheckCircle,
  Clock,
  Radio,
} from 'lucide-react';
import { WeatherConditionReport } from '../../types';

interface WeatherTelemetryWidgetProps {
  weather: WeatherConditionReport | null;
  loading?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
}

export const WeatherTelemetryWidget: React.FC<WeatherTelemetryWidgetProps> = ({
  weather,
  loading = false,
  onRefresh,
  compact = false,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  if (!weather) {
    return (
      <div className="bg-[#121b2d] border border-cyan-900/40 rounded-xl p-5 text-center text-slate-400">
        <Radio className="w-8 h-8 text-cyan-500/50 mx-auto mb-2 animate-pulse" />
        <p className="text-sm font-medium">Acquiring Polar Weather Telemetry...</p>
        <p className="text-xs text-slate-500 mt-1">Connecting to Open-Meteo polar station coordinates</p>
      </div>
    );
  }

  const isLive = weather.status === 'LIVE';
  const isStale = weather.status === 'STALE';

  const feasibilityStyles = {
    OPEN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    CAUTION: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    RESTRICTED: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    PROHIBITED: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  };

  return (
    <div className="bg-[#121b2d]/90 backdrop-blur border border-cyan-900/50 rounded-xl p-5 shadow-lg relative overflow-hidden">
      {/* Background aesthetic gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header telemetry info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/40 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase border ${
                isLive
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
              {isLive ? 'LIVE WEATHER' : 'WEATHER DATA UNAVAILABLE / LAST KNOWN DATA'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Provider: <span className="text-cyan-400 font-medium">{weather.provider}</span>
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            Last Updated:{' '}
            <span className="text-slate-300">
              {new Date(weather.lastUpdated || weather.fetchedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}{' '}
              UTC
            </span>
            {isStale && <span className="text-amber-400 ml-1">(Stale snapshot)</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-md text-xs font-bold border tracking-wider uppercase ${
              feasibilityStyles[weather.travelFeasibility] || feasibilityStyles.OPEN
            }`}
          >
            Traverse: {weather.travelFeasibility}
          </span>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="p-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-800 transition"
              title="Refresh Live Weather from Open-Meteo"
            >
              <RotateCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Conditions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Temperature */}
        <div className="bg-[#0b1220] p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" /> Ambient Temp
            </span>
            <span className="text-[10px] text-cyan-300">Chill: {weather.windChillCelsius}°C</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-200">
            {weather.temperature > 0 ? `+${weather.temperature}` : weather.temperature}°C
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Apparent: {weather.apparentTemperature}°C</div>
        </div>

        {/* Wind Speed & Direction */}
        <div className="bg-[#0b1220] p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-cyan-400" /> Wind Speed
            </span>
            <span className="text-[10px] text-cyan-300">Gusts: {weather.windGustKnots} kn</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-200">{weather.windSpeedKnots} kn</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> {weather.windDirection}° Flow
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-[#0b1220] p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-cyan-400" /> Visibility
            </span>
            <span className="text-[10px] text-cyan-300">{weather.cloudCoverPercent}% Cloud</span>
          </div>
          <div className="text-lg font-bold font-mono text-cyan-200 truncate">{weather.visibility}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Range: {(weather.visibilityMeters / 1000).toFixed(1)} km
          </div>
        </div>

        {/* Precipitation / Snow */}
        <div className="bg-[#0b1220] p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <CloudSnow className="w-3.5 h-3.5 text-cyan-400" /> Surface Condition
            </span>
            <span className="text-[10px] text-cyan-300">Ice: {weather.iceSurfaceFriction}</span>
          </div>
          <div className="text-lg font-bold text-cyan-200 truncate">{weather.condition}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Snow: {weather.snowfallCm} cm/h | Depth: {weather.snowDepthMeters} m
          </div>
        </div>
      </div>

      {/* Operational Advisory Ribbon */}
      <div className="bg-[#0a0f1d] border border-cyan-950 rounded-lg p-3 flex items-start gap-2.5">
        <AlertTriangle
          className={`w-4 h-4 mt-0.5 shrink-0 ${
            weather.travelFeasibility === 'PROHIBITED'
              ? 'text-rose-400'
              : weather.travelFeasibility === 'RESTRICTED'
              ? 'text-orange-400'
              : weather.travelFeasibility === 'CAUTION'
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}
        />
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-cyan-300">Operational Weather Advisory: </span>
          {weather.advisoryNote}
        </div>
      </div>
    </div>
  );
};

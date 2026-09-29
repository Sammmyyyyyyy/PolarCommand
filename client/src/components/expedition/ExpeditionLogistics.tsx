import React from 'react';
import { Package, Wrench, Building2, Truck, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { CargoShipment, Asset, Station } from '../../types';

interface ExpeditionLogisticsProps {
  cargo?: CargoShipment[];
  assets?: Asset[];
  stations?: Station[];
  onNavigate?: (path: string) => void;
}

export const ExpeditionLogistics: React.FC<ExpeditionLogisticsProps> = ({
  cargo = [],
  assets = [],
  stations = [],
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Cargo Shipments Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-[#0284C7]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Cargo Consignments ({cargo.length})
            </h4>
          </div>
        </div>

        {cargo.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">No active cargo shipments linked to this expedition.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {cargo.map((item) => {
              const currentStage = item.currentLocation || (item as any).currentStage || (item.status === 'Delivered' ? 'Delivered at Base' : 'Ocean / Air Corridor Transit');
              return (
                <div key={item.id || item.cargoCode} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{item.description}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        {item.cargoCode}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          item.priority?.toUpperCase() === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-sky-100 text-[#0284C7]'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>Destination: <strong className="text-slate-700 font-medium">{item.destination}</strong></span>
                      <span>•</span>
                      <span>Current Stage: <span className="text-[#0284C7] font-medium">{currentStage}</span></span>
                      <span>•</span>
                      <span>{item.weightKg?.toLocaleString()} kg</span>
                      {item.transportMode && <span>• {item.transportMode}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <span
                        className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          item.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'Delayed'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-sky-50 text-[#0284C7] border border-sky-200'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.eta && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ETA: {new Date(item.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate(`/cargo/${item.id || item.cargoCode}`);
                        }
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-sky-50 text-[#0284C7] border border-sky-200 hover:border-sky-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Truck className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>Track Shipment</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Key Assets & Heavy Machinery Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-[#0284C7]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Assigned Key Assets & Heavy Machinery ({assets.length})
            </h4>
          </div>
        </div>

        {assets.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">No heavy machinery or vehicles allocated.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assets.map((asset) => (
              <div key={asset.id || asset.assetCode} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">{asset.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {asset.assetCode} • {asset.type}
                  </div>
                  {asset.operatingHours !== undefined && (
                    <div className="text-[10px] text-slate-400">
                      Operating: {asset.operatingHours} hrs
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      asset.status === 'Operational'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {asset.status}
                  </span>
                  {asset.healthPercentage !== undefined && (
                    <div className="text-[10px] font-semibold text-slate-600 mt-1">
                      Health: {asset.healthPercentage}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Base Stations Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-[#0284C7]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Assigned Support Stations ({stations.length})
            </h4>
          </div>
        </div>

        {stations.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">No station bases assigned.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stations.map((station) => (
              <div key={station.id || station.code} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{station.name}</div>
                  <div className="text-[10px] text-slate-500">{station.region}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {station.latitude?.toFixed(2)}° S, {station.longitude?.toFixed(2)}° E
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                    {station.status || 'Operational'}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Cap: {station.capacity || 40} personnel
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

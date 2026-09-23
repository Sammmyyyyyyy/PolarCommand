import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { fetchRiskHistory } from '../services/api';
import { useExpedition } from '../context/ExpeditionContext';
import { RiskSnapshot } from '../types';

export const AnalyticsReports: React.FC = () => {
  const { currentExpeditionId, currentExpedition, dashboard } = useExpedition();
  const [riskHistory, setRiskHistory] = useState<RiskSnapshot[]>([]);

  useEffect(() => {
    async function loadHistory() {
      if (!currentExpeditionId) return;
      try {
        const history = await fetchRiskHistory(currentExpeditionId, 10);
        if (history && history.length > 0) {
          setRiskHistory(history);
        }
      } catch (err) {
        console.error('Failed to load risk history snapshots:', err);
      }
    }
    loadHistory();
  }, [currentExpeditionId]);

  // Transform real snapshots or fallback
  const riskTrendData =
    riskHistory.length > 0
      ? riskHistory.map((snap, idx) => ({
          time: snap.snapshotAt || snap.recordedAt
            ? new Date(snap.snapshotAt || snap.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : `T-${idx + 1}`,
          risk: snap.totalScore,
          cargoRisk: snap.cargoRisk || snap.breakdown?.cargo || 15,
          inventoryRisk: snap.inventoryRisk || snap.breakdown?.inventory || 15,
        }))
      : [
          { time: 'T-00:00', risk: 42, cargoRisk: 15, inventoryRisk: 15 },
          { time: 'T-06:00', risk: 36, cargoRisk: 12, inventoryRisk: 12 },
          { time: 'T-12:00', risk: 38, cargoRisk: 14, inventoryRisk: 14 },
          { time: 'T-18:00', risk: 68, cargoRisk: 42, inventoryRisk: 38 },
          { time: 'T-24:00', risk: 38, cargoRisk: 14, inventoryRisk: 14 },
        ];

  const cargoMovementData = [
    { month: 'Nov 2026', dispatched: 45, arrived: 12 },
    { month: 'Dec 2026', dispatched: 62, arrived: 48 },
    { month: 'Jan 2027', dispatched: 52, arrived: 64 },
    { month: 'Feb 2027', dispatched: 28, arrived: 45 },
    { month: 'Mar 2027', dispatched: 15, arrived: 26 },
  ];

  const inventoryCategoryLevels = [
    { category: 'Food', stockPercent: 92 },
    { category: 'Fuel', stockPercent: 78 },
    { category: 'Medicine', stockPercent: dashboard?.kpi.inventoryReadiness || 82 },
    { category: 'Spares', stockPercent: 86 },
    { category: 'Water', stockPercent: 94 },
    { category: 'Scientific', stockPercent: 80 },
  ];

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Expedition Code', currentExpedition?.code || 'INPEX-2027'],
      ['Expedition Name', currentExpedition?.name || 'Antarctic Expedition'],
      ['Overall Risk Index', String(dashboard?.kpi.overallRisk ?? 38)],
      ['Risk Level', dashboard?.kpi.riskLevel ?? 'NORMAL'],
      ['Total Personnel', String(dashboard?.kpi.personnel ?? 42)],
      ['Cargo Shipments Tracked', String(dashboard?.kpi.cargoShipments ?? 187)],
      ['Active Alerts', String(dashboard?.kpi.activeAlerts ?? 0)],
      ['Inventory Readiness', `${dashboard?.kpi.inventoryReadiness ?? 94}%`],
      ['Export Timestamp', new Date().toISOString()],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PolarCommand_Report_${currentExpedition?.code || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching Screen 12 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Analytics & Executive Reports
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 font-mono">
              {currentExpedition?.code || 'INPEX-2027'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Logistical throughput, risk trajectories, resource balance, and mission readiness indicators for{' '}
            <strong className="text-slate-800">{currentExpedition?.name || 'Active Expedition'}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Season 2026-2028</span>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 Minimal Analytics Charts matching Screen 12 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Cargo Movement */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <div className="font-extrabold text-sm text-slate-900">Cargo Movement & Throughput</div>
              <div className="text-[11px] text-slate-500">Monthly consignments dispatched vs arrived</div>
            </div>
            <span className="text-xs font-mono font-bold text-sky-700">
              {dashboard?.kpi.cargoShipments ?? 187} Tracked
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cargoMovementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="dispatched" fill="#0284c7" name="Dispatched (Depot)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="arrived" fill="#10b981" name="Arrived (On-Ice)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Real Authenticated Risk Snapshots History */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <div className="font-extrabold text-sm text-slate-900">Expedition Risk History</div>
              <div className="text-[11px] text-slate-500">
                {riskHistory.length > 0 ? 'Live database RiskSnapshot telemetry' : 'Time-series baseline'}
              </div>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                (dashboard?.kpi.overallRisk ?? 38) > 60
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              Current: {dashboard?.kpi.overallRisk ?? 38} / 100
            </span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="risk" stroke="#e11d48" strokeWidth={2.5} name="Total Expedition Risk" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="cargoRisk" stroke="#0284c7" strokeWidth={1.5} strokeDasharray="3 3" name="Cargo Factor" dot={false} />
                <Line type="monotone" dataKey="inventoryRisk" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" name="Inventory Factor" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Inventory Readiness by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <div className="font-extrabold text-sm text-slate-900">Inventory Readiness by Category</div>
              <div className="text-[11px] text-slate-500">Threshold buffer percentage across categories</div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700">6 Categories</span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryCategoryLevels} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: '#334155' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="stockPercent" fill="#0284c7" name="Readiness %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Mission Readiness Summary Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <div className="font-extrabold text-sm text-slate-900">Mission Readiness Summary</div>
              <div className="text-[11px] text-slate-500">Autonomous risk classification</div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-xs font-mono">
              Operational
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Antarctic Wintering Status</span>
                <span className="text-[11px] text-slate-500">Bharati & Maitri life support systems</span>
              </div>
              <span className="text-emerald-700 font-bold">100% Nominal</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Fuel Autonomy Buffer</span>
                <span className="text-[11px] text-slate-500">Station power generation diesel reserves</span>
              </div>
              <span className="text-slate-900 font-mono font-bold">185 Days</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Medical Triage Readiness</span>
                <span className="text-[11px] text-slate-500">Surgery theater, ventilators & cold chain plasma</span>
              </div>
              <span className="text-sky-700 font-bold">
                {dashboard?.kpi.overallRisk && dashboard.kpi.overallRisk > 60 ? 'Surge Active' : 'Normal'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

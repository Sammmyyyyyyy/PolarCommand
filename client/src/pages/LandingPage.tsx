import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radio,
  ArrowRight,
  Play,
  ShieldCheck,
  Zap,
  BarChart4,
  Compass,
  Ship,
  Boxes,
  Truck,
  HeartPulse,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onNavigatePage?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onNavigatePage }) => {
  const [activePreviewTab, setActivePreviewTab] = useState<'command' | 'cargo' | 'inventory' | 'assets' | 'emergency'>('command');

  const previewTabs = [
    { id: 'command', label: 'Command Center', icon: Radio },
    { id: 'cargo', label: 'Cargo Tracking', icon: Ship },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'assets', label: 'Assets', icon: Truck },
    { id: 'emergency', label: 'Emergency', icon: HeartPulse },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Global Public Navbar */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onEnterApp}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">POLAR COMMAND</span>
              <span className="block text-[10px] text-sky-400 font-mono tracking-widest uppercase">
                Antarctic Operations
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#hero" className="text-white hover:text-sky-400 transition">Home</a>
            <a href="#glimpse" className="hover:text-sky-400 transition">Features</a>
            <a href="#pillars" className="hover:text-sky-400 transition">Methodology</a>
            <a href="#why-it-matters" className="hover:text-sky-400 transition">Impact</a>
            <a href="#institutional" className="hover:text-sky-400 transition">About NCPOR</a>
          </nav>

          {/* CTA */}
          <button
            onClick={onEnterApp}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Launch Mission Control</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Cinematic Hero Section */}
      <section id="hero" className="relative min-h-[85vh] flex flex-col justify-between pt-12 pb-16 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        {/* Antarctic mountain and grid aura backdrop */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
        
        {/* Ambient icy gradient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-sky-500/15 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-950/80 border border-sky-800/80 text-xs font-semibold text-sky-300"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
              <span>NCPOR - Ministry of Earth Sciences Operational Context</span>
            </motion.div>

            {/* Staggered Hero Text Reveal */}
            <div className="space-y-1">
              <motion.h1
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight"
              >
                Beyond Frontiers.
              </motion.h1>
              <motion.h1
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent leading-tight"
              >
                Safer Expeditions.
              </motion.h1>
              <motion.h1
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-200 leading-tight"
              >
                Smarter Decisions.
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55 }}
              className="text-lg text-slate-300 max-w-xl font-normal leading-relaxed"
            >
              An integrated expedition logistics and asset management platform for India's Antarctic expeditions.
              Transform fragmented supply chains into real-time visibility, deterministic forecasting, and rapid decision support.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <button
                onClick={onEnterApp}
                className="flex items-center space-x-2.5 px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-xl shadow-sky-500/20 transition transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Explore the Platform</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#glimpse"
                className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-semibold text-sm transition"
              >
                <Play className="w-4 h-4 text-sky-400 fill-sky-400" />
                <span>Watch Interactive Tour</span>
              </a>
            </motion.div>
          </div>

          {/* Right Hero Graphic: Animated SVG Expedition Route */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              className="relative p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-xl shadow-2xl"
            >
              {/* Coordinates Badge */}
              <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-3">
                <span className="text-xs font-mono text-sky-300">EXPEDITION ROUTE CORRIDOR</span>
                <span className="text-xs font-mono text-slate-400">69.4° S, 76.2° E</span>
              </div>

              {/* Animated SVG Map Path */}
              <svg viewBox="0 0 400 320" className="w-full h-64 text-sky-500">
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>

                {/* Background Grid Lines */}
                <line x1="40" y1="40" x2="360" y2="40" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="40" y1="120" x2="360" y2="120" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="40" y1="200" x2="360" y2="200" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="40" y1="280" x2="360" y2="280" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />

                {/* Animated Curved Shipping Path (Goa -> Cape Town -> Antarctica) */}
                <motion.path
                  d="M 280,50 Q 180,110 110,170 T 160,280 T 310,270"
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Waypoint Nodes */}
                {/* 1. Goa */}
                <circle cx="280" cy="50" r="5" fill="#38bdf8" />
                <circle cx="280" cy="50" r="10" fill="#38bdf8" opacity="0.3" className="animate-ping" />
                <text x="295" y="55" fill="#e2e8f0" fontSize="11" fontWeight="bold">Goa (NCPOR HQ)</text>

                {/* 2. Cape Town */}
                <circle cx="110" cy="170" r="5" fill="#38bdf8" />
                <text x="35" y="165" fill="#94a3b8" fontSize="10">Cape Town Staging</text>

                {/* 3. Maitri Station */}
                <circle cx="160" cy="280" r="5" fill="#10b981" />
                <text x="95" y="302" fill="#e2e8f0" fontSize="11" fontWeight="bold">Maitri (-18°C)</text>

                {/* 4. Bharati Station */}
                <circle cx="310" cy="270" r="6" fill="#06b6d4" />
                <circle cx="310" cy="270" r="12" fill="#06b6d4" opacity="0.4" className="animate-ping" />
                <text x="260" y="250" fill="#38bdf8" fontSize="11" fontWeight="bold">Bharati Base (-12°C)</text>

                {/* Vessel Marker */}
                <motion.g
                  animate={{
                    x: [280, 110, 160, 310],
                    y: [50, 170, 280, 270],
                  }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                >
                  <circle cx="0" cy="0" r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                </motion.g>
              </svg>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                <span className="flex items-center space-x-1.5 text-sky-300 font-medium">
                  <Ship className="w-3.5 h-3.5" />
                  <span>MV Polar Queen En Route</span>
                </span>
                <span className="font-mono text-emerald-400">ETA: 14 Jan 18:00</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Hero Stats Strip with Count-up */}
        <div className="max-w-7xl mx-auto px-6 w-full pt-12 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-md">
            <div className="text-center md:text-left">
              <div className="text-3xl lg:text-4xl font-extrabold text-white">2</div>
              <div className="text-xs uppercase tracking-wider font-semibold text-sky-400 mt-1">Research Stations</div>
              <div className="text-xs text-slate-400">Maitri & Bharati</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-3xl lg:text-4xl font-extrabold text-white">500+</div>
              <div className="text-xs uppercase tracking-wider font-semibold text-sky-400 mt-1">Expedition Members</div>
              <div className="text-xs text-slate-400">Scientists & wintering crews</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-3xl lg:text-4xl font-extrabold text-white">1000+</div>
              <div className="text-xs uppercase tracking-wider font-semibold text-sky-400 mt-1">Cargo Shipments</div>
              <div className="text-xs text-slate-400">Tracked across global hubs</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-3xl lg:text-4xl font-extrabold text-white">1 Mission</div>
              <div className="text-xs uppercase tracking-wider font-semibold text-sky-400 mt-1">Operational Goal</div>
              <div className="text-xs text-slate-400">A Safer, Stronger Tomorrow</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "A Glimpse Inside" Interactive Product Previews */}
      <section id="glimpse" className="py-24 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              A Glimpse Inside
            </h2>
            <p className="text-slate-400 text-base">
              Everything you need to plan, track, predict, and respond — unified into one command interface.
            </p>
          </div>

          {/* Tab Selector Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {previewTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Screen Preview Container */}
          <div className="relative rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden p-1.5 md:p-3">
            {/* Header chrome */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 rounded-t-xl border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  polarcommand.ncpor.res.in/{activePreviewTab}
                </span>
              </div>
              <button
                onClick={() => {
                  if (onNavigatePage) {
                    const routeMap: Record<string, string> = {
                      command: '/dashboard',
                      cargo: '/cargo',
                      inventory: '/inventory',
                      assets: '/assets',
                      emergency: '/emergency',
                    };
                    onNavigatePage(routeMap[activePreviewTab]);
                  } else {
                    onEnterApp();
                  }
                }}
                className="flex items-center space-x-1 text-sky-400 hover:text-sky-300 font-semibold text-xs"
              >
                <span>Launch This Screen</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Simulated Dynamic Screen Content */}
            <div className="p-4 sm:p-6 bg-[#F8FAFC] text-slate-900 rounded-b-xl min-h-[420px] transition-all">
              {activePreviewTab === 'command' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Command Center Overview</h3>
                      <p className="text-xs text-slate-500">Expedition INPEX-2027 • Real-Time Operational Posture</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg">
                      Readiness: 91%
                    </span>
                  </div>

                  {/* KPI Mini Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Personnel</div>
                      <div className="text-2xl font-extrabold text-slate-900">42</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Shipments</div>
                      <div className="text-2xl font-extrabold text-sky-600">187</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Operational Assets</div>
                      <div className="text-2xl font-extrabold text-slate-900">23</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Active Alerts</div>
                      <div className="text-2xl font-extrabold text-rose-600">4</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Polar Mission Map & Multi-Corridor Tracking</div>
                      <div className="text-[11px] text-slate-500">
                        Tracks vessel journeys from Goa & Mumbai across the Roaring Forties to Prydz Bay.
                      </div>
                    </div>
                    <button
                      onClick={onEnterApp}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition whitespace-nowrap"
                    >
                      Open Full Interactive Map
                    </button>
                  </div>
                </div>
              )}

              {activePreviewTab === 'cargo' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Cargo Logistics Manifest</h3>
                      <p className="text-xs text-slate-500">Filterable manifest with delay simulations & impact breakdown</p>
                    </div>
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold rounded-lg">
                      187 Tracked Consignments
                    </span>
                  </div>

                  {/* Sample table preview */}
                  <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Cargo ID</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5">Destination</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-sky-700">MED-024</td>
                          <td className="p-2.5">Medical</td>
                          <td className="p-2.5">Critical Antarctic Medical Supplies</td>
                          <td className="p-2.5">Bharati</td>
                          <td className="p-2.5"><span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px]">In Transit</span></td>
                          <td className="p-2.5"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px]">High</span></td>
                        </tr>
                        <tr className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-800">FUEL-001</td>
                          <td className="p-2.5">Fuel</td>
                          <td className="p-2.5">Polar Aviation Turbine Fuel</td>
                          <td className="p-2.5">Bharati</td>
                          <td className="p-2.5"><span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px]">In Transit</span></td>
                          <td className="p-2.5"><span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">Medium</span></td>
                        </tr>
                        <tr className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-800">SP-032</td>
                          <td className="p-2.5">Spare Parts</td>
                          <td className="p-2.5">PistenBully Hydraulic Spares</td>
                          <td className="p-2.5">Bharati</td>
                          <td className="p-2.5"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px]">Delayed</span></td>
                          <td className="p-2.5"><span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px]">Critical</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activePreviewTab === 'inventory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Inventory Intelligence</h3>
                      <p className="text-xs text-slate-500">Deterministic consumption projections across 6 vital categories</p>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg">
                      2 Items at Safety Threshold
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-xs text-slate-500">Medical Stock</div>
                      <div className="text-xl font-bold text-slate-900">220 units</div>
                      <div className="text-xs text-rose-600 font-semibold mt-1">11 days remaining (Threshold: 10d)</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-xs text-slate-500">Generator Fuel</div>
                      <div className="text-xl font-bold text-slate-900">4,800 L</div>
                      <div className="text-xs text-amber-600 font-semibold mt-1">22 days remaining (Threshold: 10d)</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-xs text-slate-500">Food Rations</div>
                      <div className="text-xl font-bold text-slate-900">1,200 kg</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-1">28 days remaining (Threshold: 14d)</div>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'assets' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Asset Health & Predictive Maintenance</h3>
                      <p className="text-xs text-slate-500">Telemetry tracking for snow vehicles, gensets, cranes, and radar</p>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                      19/23 Operational
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">PB-04 • PistenBully 600 Polar</span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded">72% Health</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[72%]"></div>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Engine Hours: 4,821 hrs • Hydraulic delta detected • Recommendation: Inspect within 5 days.
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === 'emergency' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Emergency Response Engine</h3>
                      <p className="text-xs text-slate-500">Autonomous nearest-station, rescue-vehicle & doctor triage</p>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg animate-pulse">
                      INC-011 In Progress
                    </span>
                  </div>

                  <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2 text-xs">
                    <div className="font-bold text-rose-900 text-sm">Snow Vehicle PB-04 Breakdown (25 km from Bharati)</div>
                    <div className="text-rose-700">4 expedition scientists affected • Temperature dropping to -19°C</div>
                    <div className="bg-white p-2.5 rounded-lg border border-rose-100 space-y-1 text-slate-800 font-medium">
                      <div>1. Dispatch PB-07 Rescue Cab immediately (ETA 45 mins)</div>
                      <div>2. Dr. Anita Singh assigned to on-board medical triage team</div>
                      <div>3. Carry replacement hydraulic belt kit & thermal survival gear</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sticky Stacked Pillars Section: TRACK -> PREDICT -> ANALYZE -> RESPOND */}
      <section id="pillars" className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-sky-400 uppercase">Operational Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              The 4 Pillars of Expedition Command
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              How POLAR COMMAND turns fragmented logistics logs into an actionable mission control loop.
            </p>
          </div>

          <div className="space-y-6">
            {/* Card 1: TRACK */}
            <div className="sticky top-28 p-8 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/90 border border-slate-700 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  PILLAR 01
                </span>
                <Ship className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">TRACK — Comprehensive Visibility</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Connect every personnel member, maritime vessel, airlink, and on-ice snow vehicle into a unified spatial map.
                Monitor shipments departing Goa and Mumbai through Cape Town to Antarctic fast ice.
              </p>
            </div>

            {/* Card 2: PREDICT */}
            <div className="sticky top-36 p-8 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/90 border border-slate-700 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  PILLAR 02
                </span>
                <Boxes className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">PREDICT — Deterministic Forecasting</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Calculate expected daily consumption for food, polar fuel, trauma antibiotics, and spare parts.
                Anticipate stockout dates weeks ahead of time to prevent supply cliffs before extreme blizzards close runways.
              </p>
            </div>

            {/* Card 3: ANALYZE */}
            <div className="sticky top-44 p-8 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/90 border border-slate-700 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  PILLAR 03
                </span>
                <BarChart4 className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">ANALYZE — Cascading Impact & Risk</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Understand how a 48h sea-ice delay cascades through inventory buffers, spikes station risk, and threatens wintering operations.
                No opaque black-box AI scores — every number has an explainable factor breakdown.
              </p>
            </div>

            {/* Card 4: RESPOND */}
            <div className="sticky top-52 p-8 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/90 border border-slate-700 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  PILLAR 04
                </span>
                <Zap className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">RESPOND — Actionable Dispatch</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Instantly generate actionable response plans: reallocate surplus stock from Maitri, dispatch heated rescue snow vehicles,
                and track risk mitigation down to safe baselines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "Why It Matters" Grid & NCPOR Heritage */}
      <section id="why-it-matters" className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-white">Why It Matters</h2>
            <p className="text-slate-400 text-sm">Solving the extreme logistics challenges of India's polar research program.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-sky-950 text-sky-400 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Life Safety</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Protects the lives of scientists and wintering teams living in -40°C isolation thousands of miles from emergency hospitals.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Operational Efficiency</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Minimizes million-dollar vessel demurrages, prevents idle ice-breaker standby, and optimizes polar equipment allocations.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center">
                <BarChart4 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Data-Driven Decisions</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transitions expedition leadership from ad-hoc spreadsheets to predictive what-if simulations and transparent risk engines.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-950 text-purple-400 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Stronger Research</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ensures uninterrupted power and consumables for climate science, glaciology, and space weather monitoring.
              </p>
            </div>
          </div>

          {/* NCPOR Quotation Card */}
          <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-xl sm:text-2xl font-serif italic text-slate-200">
                "Every successful expedition is a story of planning, people, and precision."
              </div>
              <div className="text-xs text-sky-400 font-mono tracking-wider">— National Centre for Polar and Ocean Research (NCPOR)</div>
            </div>
            <button
              onClick={onEnterApp}
              className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition whitespace-nowrap shadow-md"
            >
              Open Expedition Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* 6. Institutional Reference Context */}
      <section id="institutional" className="py-16 bg-slate-900 border-t border-slate-800 text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-4">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            Institutional Context & Mission Alignment
          </div>
          <h3 className="text-lg font-bold text-white">
            Designed for India's Polar Expedition Operations
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Built for Smart India Hackathon Problem Statement 26062: Integrated Polar Expedition Logistics and Asset Management System.
            Dedicated to the operational requirements of the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences, Government of India.
          </p>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 POLAR COMMAND • Integrated Polar Expedition Logistics Platform
          </div>
          <div className="flex items-center space-x-6">
            <button onClick={onEnterApp} className="hover:text-sky-400 transition">Dashboard</button>
            <button onClick={() => onNavigatePage && onNavigatePage('/cargo')} className="hover:text-sky-400 transition">Cargo Tracking</button>
            <button onClick={() => onNavigatePage && onNavigatePage('/inventory')} className="hover:text-sky-400 transition">Inventory</button>
            <button onClick={() => onNavigatePage && onNavigatePage('/emergency')} className="hover:text-sky-400 transition">Emergency Response</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

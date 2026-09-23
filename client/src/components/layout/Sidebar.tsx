import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  CalendarDays,
  Package,
  Boxes,
  Truck,
  Users,
  Navigation,
  Building2,
  ShieldAlert,
  SlidersHorizontal,
  BellRing,
  BarChart3,
  Sparkles,
  Globe,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useExpedition } from '../../context/ExpeditionContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  const { currentExpedition, dashboard } = useExpedition();

  const activeAlerts = dashboard?.kpi.activeAlerts ?? 0;

  const navItems = [
    { id: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: '/expeditions', label: 'Expeditions Hub', icon: FolderOpen },
    { id: '/expedition', label: 'Expedition Planning', icon: CalendarDays },
    { id: '/cargo', label: 'Cargo Tracking', icon: Package },
    { id: '/inventory', label: 'Inventory Intelligence', icon: Boxes },
    { id: '/assets', label: 'Asset Management', icon: Truck },
    { id: '/personnel', label: 'Personnel Positioning', icon: Users },
    { id: '/movements', label: 'Transit & Movements', icon: Navigation },
    { id: '/stations', label: 'Station Overview', icon: Building2 },
    { id: '/emergency', label: 'Emergency Response', icon: ShieldAlert },
    { id: '/simulations', label: 'What-If Simulation', icon: SlidersHorizontal },
    { id: '/alerts', label: 'Alerts & Actions', icon: BellRing, badgeCount: activeAlerts > 0 ? activeAlerts : undefined },
    { id: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: '/optimization', label: 'Resource Optimization', icon: Sparkles, bonus: true },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <button
          onClick={() => onNavigate('/dashboard')}
          className="flex items-center space-x-3 text-left focus:outline-hidden group"
        >
          <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-200 group-hover:bg-sky-700 transition">
            <Radio className="w-5 h-5 text-sky-100 animate-pulse" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-900 leading-none">
                POLAR COMMAND
              </div>
              <div className="text-[10px] text-sky-700 font-medium tracking-wide mt-0.5">
                EXPEDITION CONTROL
              </div>
            </div>
          )}
        </button>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.id ||
            (item.id === '/cargo' && currentPath.startsWith('/cargo/')) ||
            (item.id === '/expeditions' && currentPath.startsWith('/expeditions/'));

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-sky-50 text-sky-700 border-l-3 border-sky-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${collapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!collapsed && <span>{item.label}</span>}
              </div>

              {!collapsed && (
                <div className="flex items-center space-x-1">
                  {item.badgeCount && (
                    <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] rounded-full font-bold">
                      {item.badgeCount}
                    </span>
                  )}
                  {item.bonus && (
                    <span className="px-1 py-0.2 bg-sky-100 text-sky-800 text-[9px] rounded font-mono uppercase">
                      Bonus
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Utility Section */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        <button
          onClick={() => onNavigate('/')}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-sky-700 hover:bg-slate-50 transition ${
            collapsed ? 'justify-center' : 'space-x-3'
          }`}
          title={collapsed ? 'Public Portal' : undefined}
        >
          <Globe className="w-4 h-4 text-slate-400" />
          {!collapsed && <span>Public Portal / Home</span>}
        </button>

        {!collapsed && (
          <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-800 truncate max-w-[110px]">
                {currentExpedition?.code || 'Active'}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">v2.4</span>
          </div>
        )}
      </div>
    </aside>
  );
};

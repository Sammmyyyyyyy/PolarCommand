import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  CalendarDays,
  Package,
  Boxes,
  Box,
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
  Compass,
  Wrench,
  CheckSquare,
  AlertTriangle,
  ClipboardList,
  MapPin,
  Settings,
  Flame,
  FileText,
  Mountain,
} from 'lucide-react';
import { useExpedition } from '../../context/ExpeditionContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeAlertCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badgeCount?: number;
  alert?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  collapsed,
  onToggleCollapse,
  activeAlertCount,
}) => {
  const { currentExpedition, dashboard } = useExpedition();
  const { currentRole } = useAuth();

  const activeAlerts = activeAlertCount !== undefined ? activeAlertCount : (dashboard?.kpi.activeAlerts ?? 0);

  // Canonical Navigation Items unified across ALL roles (Section 20 & Section 1, 2)
  const navItems: NavItem[] = [
    { id: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: '/expeditions', label: 'Expeditions', icon: Mountain },
    { id: '/live-map', label: 'Live Map', icon: MapPin },
    { id: '/stations', label: 'Stations', icon: Building2 },
    { id: '/personnel', label: 'Personnel', icon: Users },
    { id: '/inventory', label: 'Inventory', icon: Boxes },
    { id: '/logistics', label: 'Supply & Logistics', icon: ClipboardList },
    { id: '/assets', label: 'Equipment', icon: Box },
    { id: '/alerts', label: 'Alerts', icon: BellRing, badgeCount: activeAlerts > 0 ? activeAlerts : undefined },
    { id: '/analytics', label: 'Reports', icon: BarChart3 },
    { id: '/organization', label: 'Settings', icon: Settings },
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
          className="flex items-center space-x-2.5 text-left focus:outline-hidden group cursor-pointer"
        >
          <div className="w-8 h-8 flex items-center justify-center text-[#0284C7]">
            <svg className="w-7 h-7 text-[#0284C7]" viewBox="0 0 36 28" fill="none">
              <path d="M3 24L11 8L16 17L22 5L33 24H3Z" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-[13px] tracking-tight text-slate-900 leading-tight">
                POLAR COMMAND
              </div>
              <div className="text-[9px] text-slate-400 font-medium tracking-wider uppercase leading-none mt-0.5">
                ANTARCTIC OPERATIONS
              </div>
            </div>
          )}
        </button>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.id ||
            (item.id === '/logistics' && (currentPath.startsWith('/logistics') || currentPath.startsWith('/requirements'))) ||
            (item.id === '/cargo' && currentPath.startsWith('/cargo/')) ||
            (item.id === '/expeditions' && currentPath.startsWith('/expeditions/')) ||
            (item.id === '/dashboard' &&
              (currentPath === '/station' ||
                currentPath === '/expedition-leader' ||
                currentPath === '/logistics-command' ||
                currentPath === '/member' ||
                currentPath === '/admin'));

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs transition-all group cursor-pointer ${
                isActive
                  ? 'bg-sky-50 text-[#0284C7] font-semibold shadow-2xs'
                  : item.alert
                  ? 'text-rose-700 hover:bg-rose-50 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              } ${collapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive
                      ? 'text-[#0284C7]'
                      : item.alert
                      ? 'text-rose-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && (
                <div className="flex items-center space-x-1">
                  {item.badgeCount && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {item.badgeCount}
                    </span>
                  )}
                  {item.alert && (
                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[9px] font-semibold rounded uppercase">
                      SOS
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Role / Mode Indicator */}
      <div className="p-3 border-t border-slate-100 bg-white space-y-2">
        {!collapsed && (
          <div className="space-y-2">
            {/* Subtle Arctic Station Illustration */}
            <div className="w-full h-16 rounded-xl overflow-hidden relative opacity-70 bg-gradient-to-t from-sky-50 to-transparent flex items-end justify-center pb-1">
              <svg viewBox="0 0 160 50" className="w-full h-full text-sky-400/80" fill="none">
                <path d="M0,45 L25,22 L55,42 L85,15 L120,40 L160,25 L160,50 L0,50 Z" fill="#E0F2FE" opacity="0.6"/>
                <path d="M15,45 L45,28 L75,45 L110,24 L145,46 L160,35 L160,50 L0,50 Z" fill="#BAE6FD" opacity="0.5"/>
                <rect x="68" y="32" width="24" height="12" rx="1.5" fill="#93C5FD"/>
                <line x1="80" y1="32" x2="80" y2="12" stroke="#0284C7" strokeWidth="1.5"/>
                <circle cx="80" cy="12" r="2" fill="#0284C7"/>
                <path d="M75,16 Q80,12 85,16" stroke="#0284C7" strokeWidth="1" fill="none"/>
                <path d="M72,20 Q80,14 88,20" stroke="#0284C7" strokeWidth="1" fill="none"/>
              </svg>
            </div>

            {/* Version & NCPOR Attribution */}
            <div className="text-[10px] text-slate-400 leading-tight">
              <div className="font-semibold text-slate-600 flex items-center gap-1">
                <Globe className="w-3 h-3 text-sky-500" />
                <span>PolarCommand v2.6.1</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 font-normal">
                Indian National Centre for Polar and Ocean Research (NCPOR)
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

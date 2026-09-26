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
  Compass,
  Wrench,
  CheckSquare,
  AlertTriangle,
  ClipboardList,
  MapPin,
  Settings,
  Flame,
} from 'lucide-react';
import { useExpedition } from '../../context/ExpeditionContext';
import { useAuth } from '../../context/AuthContext';

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
  const { currentRole, isAdmin, isStationManager, isExpeditionLeader, isTeamMember } = useAuth();

  const activeAlerts = dashboard?.kpi.activeAlerts ?? 0;

  // Define Navigation Items based on the authenticated Role (Section 14)
  const getNavItemsForRole = () => {
    switch (currentRole) {
      case 'ADMIN':
        return [
          { id: '/dashboard', label: 'Admin Command', icon: LayoutDashboard },
          { id: '/expeditions', label: 'Expeditions', icon: FolderOpen },
          { id: '/stations', label: 'Stations Overview', icon: Building2 },
          { id: '/personnel', label: 'Personnel', icon: Users },
          { id: '/assets', label: 'Equipment & Fleet', icon: Truck },
          { id: '/inventory', label: 'Inventory & Supplies', icon: Boxes },
          { id: '/cargo', label: 'Cargo Operations', icon: Package },
          { id: '/movements', label: 'Communications & Transit', icon: Navigation },
          { id: '/alerts', label: 'Critical Alerts', icon: BellRing, badgeCount: activeAlerts > 0 ? activeAlerts : undefined },
          { id: '/analytics', label: 'Reports & Analytics', icon: BarChart3 },
          { id: '/organization', label: 'System Settings', icon: Settings },
        ];

      case 'STATION_MANAGER':
        return [
          { id: '/station', label: 'Station Command', icon: Building2 },
          { id: '/movements', label: 'Expedition Tracking', icon: Navigation },
          { id: '/personnel', label: 'Station Personnel', icon: Users },
          { id: '/inventory', label: 'Station Inventory', icon: Boxes },
          { id: '/assets', label: 'Equipment & Power', icon: Truck },
          { id: '/cargo', label: 'Inbound Cargo', icon: Package },
          { id: '/alerts', label: 'Station Alerts', icon: BellRing, badgeCount: activeAlerts > 0 ? activeAlerts : undefined },
          { id: '/emergency', label: 'Incidents & Safety', icon: ShieldAlert },
          { id: '/analytics', label: 'Station Reports', icon: BarChart3 },
        ];

      case 'EXPEDITION_LEADER':
        return [
          { id: '/expedition-leader', label: 'Expedition Command', icon: Compass },
          { id: '/expedition', label: 'Mission Planning', icon: CalendarDays },
          { id: '/assets', label: 'Equipment Assignment', icon: Wrench },
          { id: '/personnel', label: 'Team Roster', icon: Users },
          { id: '/cargo', label: 'Expedition Cargo', icon: Package },
          { id: '/inventory', label: 'Supplies & Reserves', icon: Boxes },
          { id: '/movements', label: 'Field Tracking', icon: Navigation },
          { id: '/emergency', label: 'Incidents & SOS', icon: ShieldAlert },
          { id: '/alerts', label: 'Expedition Alerts', icon: BellRing, badgeCount: activeAlerts > 0 ? activeAlerts : undefined },
          { id: '/simulations', label: 'What-If Simulation', icon: SlidersHorizontal },
        ];

      case 'TEAM_MEMBER':
      default:
        return [
          { id: '/member', label: 'Field Workspace', icon: Compass },
          { id: '/expedition', label: 'My Expedition', icon: FolderOpen },
          { id: '/movements', label: 'Team Map', icon: MapPin },
          { id: '/assets', label: 'My Equipment', icon: Wrench },
          { id: '/emergency', label: 'Emergency SOS', icon: ShieldAlert, alert: true },
          { id: '/alerts', label: 'Field Alerts', icon: BellRing, badgeCount: activeAlerts > 0 ? activeAlerts : undefined },
        ];
    }
  };

  const navItems = getNavItemsForRole();

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <button
          onClick={() => {
            if (currentRole === 'ADMIN') onNavigate('/dashboard');
            else if (currentRole === 'STATION_MANAGER') onNavigate('/station');
            else if (currentRole === 'EXPEDITION_LEADER') onNavigate('/expedition-leader');
            else onNavigate('/member');
          }}
          className="flex items-center space-x-3 text-left focus:outline-hidden group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200 group-hover:bg-blue-700 transition">
            <Radio className="w-5 h-5 text-blue-100 animate-pulse" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-900 leading-none">
                POLAR COMMAND
              </div>
              <div className="text-[10px] text-blue-700 font-bold tracking-wider uppercase mt-0.5">
                {currentRole.replace('_', ' ')}
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
                  ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-bold shadow-2xs'
                  : item.alert
                  ? 'text-rose-700 hover:bg-rose-50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${collapsed ? 'justify-center' : 'justify-between'}`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive
                      ? 'text-blue-600'
                      : item.alert
                      ? 'text-rose-600'
                      : 'text-slate-400 group-hover:text-slate-600'
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
                  {item.alert && (
                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[9px] font-extrabold rounded uppercase">
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
      <div className="p-3 border-t border-slate-100 space-y-2">
        <button
          onClick={() => onNavigate('/login')}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition ${
            collapsed ? 'justify-center' : 'space-x-2'
          }`}
          title="Switch Active Role"
        >
          <Users className="w-4 h-4 text-blue-600" />
          {!collapsed && <span>Role Switcher / Login</span>}
        </button>

        <button
          onClick={() => onNavigate('/')}
          className={`w-full flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition ${
            collapsed ? 'justify-center' : 'space-x-3'
          }`}
          title={collapsed ? 'Public Portal' : undefined}
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
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
            <span className="text-[10px] text-slate-400 font-mono">v2.5</span>
          </div>
        )}
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';

interface AppLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onRefreshData?: () => void;
  activeAlertCount?: number;
  expeditionRisk?: number;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPath,
  onNavigate,
  onRefreshData,
  activeAlertCount = 0,
  expeditionRisk = 38,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const { currentRole } = useAuth();

  return (
    <div className={`flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans ${currentRole === 'ADMIN' ? 'admin-shell' : ''}`}>
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Mission Control Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onRefreshData={onRefreshData}
          activeAlertCount={activeAlertCount}
          expeditionRisk={expeditionRisk}
          onNavigate={onNavigate}
        />

        {/* Dynamic Page Scroll Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

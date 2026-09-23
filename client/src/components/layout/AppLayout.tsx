import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

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
  activeAlertCount = 4,
  expeditionRisk = 38,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-900 font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
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

import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchDashboard,
  fetchCargo,
  fetchInventory,
  fetchAssets,
  fetchPersonnel,
  fetchIncidents,
  fetchAlerts,
  fetchActions,
} from './services/api';
import {
  DashboardSummary,
  CargoShipment,
  InventoryItem,
  Asset,
  Personnel,
  Incident,
  Alert,
  ActionItem,
} from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpeditionProvider, useExpedition } from './context/ExpeditionContext';
import { LandingPage } from './pages/LandingPage';
import { AppLayout } from './components/layout/AppLayout';
import { CommandCenter } from './pages/CommandCenter';
import { ExpeditionListPage } from './pages/ExpeditionListPage';
import { ExpeditionDetailPage } from './pages/ExpeditionDetailPage';
import { CreateExpeditionPage } from './pages/CreateExpeditionPage';
import { ExpeditionPlanning } from './pages/ExpeditionPlanning';
import { CargoTracking } from './pages/CargoTracking';
import { CargoDetail } from './pages/CargoDetail';
import { InventoryIntelligence } from './pages/InventoryIntelligence';
import { AssetManagement } from './pages/AssetManagement';
import { PersonnelMovement } from './pages/PersonnelMovement';
import { MovementsPage } from './pages/MovementsPage';
import { EmergencyResponse } from './pages/EmergencyResponse';
import { WhatIfSimulation } from './pages/WhatIfSimulation';
import { StationOverview } from './pages/StationOverview';
import { AlertsActionCenter } from './pages/AlertsActionCenter';
import { AnalyticsReports } from './pages/AnalyticsReports';
import { ResourceOptimization } from './pages/ResourceOptimization';
import { FieldMemberWorkspace } from './pages/FieldMemberWorkspace';
import { OrganizationAdminPage } from './pages/OrganizationAdminPage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { StationManagerDashboard } from './pages/StationManagerDashboard';
import { ExpeditionLeaderDashboard } from './pages/ExpeditionLeaderDashboard';
import { TeamMemberWorkspace } from './pages/TeamMemberWorkspace';
import { LogisticsCommanderDashboard } from './pages/LogisticsCommanderDashboard';
import { LogisticsHub } from './pages/LogisticsHub';
import { LiveMapPage } from './pages/LiveMapPage';
import { MissionPlanningPage } from './pages/MissionPlanningPage';
import { ShieldAlert } from 'lucide-react';

function MainApp() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = window.location.pathname;
    return p && p !== '/' ? p : '/';
  });
  const [selectedCargoId, setSelectedCargoId] = useState<string>('MED-024');

  const {
    currentExpeditionId,
    currentExpedition,
    dashboard,
    triggerRefresh,
    switchExpedition,
  } = useExpedition();

  const {
    currentRole,
    currentUser,
    isAuthenticated,
    isLoadingAuth,
    isAdmin,
    isStationManager,
    isExpeditionLeader,
    isTeamMember,
    isLogisticsCommander,
    canCreateExpedition,
  } = useAuth();

  // Operational State
  const [cargoList, setCargoList] = useState<CargoShipment[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [incidentsList, setIncidentsList] = useState<Incident[]>([]);
  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const [actionsList, setActionsList] = useState<ActionItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Sync with browser history and handle popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auth routing guard: unauthenticated users redirect to login, authenticated users at /login redirect to dashboard
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!isAuthenticated && currentPath !== '/' && currentPath !== '/login') {
      setCurrentPath('/login');
      if (window.location.pathname !== '/login') {
        window.history.pushState({}, '', '/login');
      }
    } else if (isAuthenticated && currentPath === '/login') {
      const target = isAdmin
        ? '/dashboard'
        : isStationManager
        ? '/station'
        : isExpeditionLeader
        ? '/expedition-leader'
        : isLogisticsCommander
        ? '/logistics-command'
        : '/member';
      setCurrentPath(target);
      if (window.location.pathname !== target) {
        window.history.pushState({}, '', target);
      }
    }
  }, [isAuthenticated, isLoadingAuth, currentPath, isAdmin, isStationManager, isExpeditionLeader, isLogisticsCommander]);

  const loadData = useCallback(async () => {
    if (!currentExpeditionId) return;
    try {
      setIsLoadingData(true);
      const [cargo, inv, assets, people, inc, alerts, actions] = await Promise.all([
        fetchCargo(currentExpeditionId),
        fetchInventory(currentExpeditionId),
        fetchAssets(currentExpeditionId),
        fetchPersonnel(currentExpeditionId),
        fetchIncidents(currentExpeditionId),
        fetchAlerts(currentExpeditionId),
        fetchActions(currentExpeditionId),
      ]);

      setCargoList(cargo);
      setInventoryList(inv);
      setAssetsList(assets);
      setPersonnelList(people);
      setIncidentsList(inc);
      setAlertsList(alerts);
      setActionsList(actions);
    } catch (err) {
      console.error('Failed to load telemetry for active expedition:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [currentExpeditionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCargo = (cargoId: string) => {
    setSelectedCargoId(cargoId);
    setCurrentPath(`/cargo/${cargoId}`);
  };

  const handleRefreshAll = () => {
    triggerRefresh();
    loadData();
  };

  // If on public Landing Page
  if (currentPath === '/') {
    return (
      <LandingPage
        onEnterApp={() => handleNavigate('/login')}
        onNavigatePage={(path) => handleNavigate(path)}
      />
    );
  }

  // If on dedicated Role-Aware Login Page
  if (currentPath === '/login') {
    return (
      <LoginPage
        onNavigate={handleNavigate}
        onLoginSuccess={(role) => {
          if (role === 'ADMIN') handleNavigate('/dashboard');
          else if (role === 'STATION_MANAGER') handleNavigate('/station');
          else if (role === 'EXPEDITION_LEADER') handleNavigate('/expedition-leader');
          else if (role === 'LOGISTICS_COMMANDER') handleNavigate('/logistics-command');
          else handleNavigate('/member');
        }}
      />
    );
  }

  // Find inspected cargo if on detail view
  const currentCargoItem =
    cargoList.find((c) => c.id.toLowerCase() === selectedCargoId.toLowerCase()) || cargoList[0];

  const basePath = currentPath.split('?')[0];

  return (
    <AppLayout
      currentPath={basePath}
      onNavigate={handleNavigate}
      onRefreshData={handleRefreshAll}
      activeAlertCount={alertsList.filter((a) => a.status.toUpperCase() !== 'RESOLVED').length}
      expeditionRisk={dashboard?.kpi.overallRisk ?? 38}
    >
      {/* Dynamic Role-Aware Dashboard Router */}
      {currentPath === '/dashboard' && (
        isAdmin ? (
          <AdminDashboard
            onNavigate={handleNavigate}
            onCreateExpedition={() => handleNavigate('/expeditions/new')}
          />
        ) : isStationManager ? (
          <StationManagerDashboard onNavigate={handleNavigate} />
        ) : isExpeditionLeader ? (
          <ExpeditionLeaderDashboard onNavigate={handleNavigate} />
        ) : isLogisticsCommander ? (
          <LogisticsCommanderDashboard onNavigate={handleNavigate} />
        ) : (
          <TeamMemberWorkspace onNavigate={handleNavigate} />
        )
      )}

      {/* Explicit Role Command Centers */}
      {currentPath === '/admin' && (
        <AdminDashboard
          onNavigate={handleNavigate}
          onCreateExpedition={() => handleNavigate('/expeditions/new')}
        />
      )}

      {currentPath === '/station' && (
        <StationManagerDashboard onNavigate={handleNavigate} />
      )}

      {currentPath === '/expedition-leader' && (
        <ExpeditionLeaderDashboard onNavigate={handleNavigate} />
      )}

      {currentPath === '/logistics-command' && (
        <LogisticsCommanderDashboard onNavigate={handleNavigate} />
      )}

      {(currentPath.startsWith('/logistics') || currentPath.startsWith('/requirements')) && (
        <LogisticsHub
          initialTab={
            currentPath.includes('tab=finalized')
              ? 'finalized'
              : currentPath.includes('tab=tracking')
              ? 'tracking'
              : currentPath.includes('tab=procurement') || currentPath.includes('tab=suppliers')
              ? 'procurement'
              : 'requirements'
          }
          onNavigate={handleNavigate}
        />
      )}

      {basePath === '/live-map' && (
        <LiveMapPage onNavigate={handleNavigate} />
      )}

      {basePath === '/mission-planning' && (
        <MissionPlanningPage onNavigate={handleNavigate} />
      )}

      {(basePath === '/member' || basePath === '/field') && (
        <TeamMemberWorkspace onNavigate={handleNavigate} />
      )}

      {basePath === '/expeditions' && (
        <ExpeditionListPage
          onNavigate={handleNavigate}
          onSelectExpedition={(id) => {
            switchExpedition(id);
            handleNavigate(`/expeditions/${id}`);
          }}
          onCreateNew={() => handleNavigate('/expeditions/new')}
        />
      )}

      {basePath.startsWith('/expeditions/') && basePath !== '/expeditions/new' && (
        <ExpeditionDetailPage
          expeditionId={basePath.replace('/expeditions/', '')}
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('/expeditions')}
        />
      )}

      {/* Critical Role Gate: ONLY ADMIN CAN CREATE AN EXPEDITION */}
      {basePath === '/expeditions/new' && (
        (!canCreateExpedition && !isAdmin) ? (
          <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">403 Forbidden - Admin Access Required</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Only authorized Mission Control Administrators can create and commission new Antarctic expeditions. Station Managers, Expedition Leaders, and Field Members do not have permission to commission new expeditions.
            </p>
            <button
              onClick={() => handleNavigate('/expeditions')}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
            >
              Return to Expeditions Hub
            </button>
          </div>
        ) : (
          <CreateExpeditionPage
            onCancel={() => handleNavigate('/expeditions')}
            onCreated={(expedition) => {
              switchExpedition(expedition.id);
              handleNavigate('/dashboard');
            }}
          />
        )
      )}

      {basePath === '/expedition' && (
        <ExpeditionPlanning
          expedition={dashboard?.expedition || currentExpedition || null}
          onNavigate={handleNavigate}
        />
      )}

      {basePath === '/cargo' && (
        <CargoTracking
          cargoList={cargoList}
          onSelectCargo={handleSelectCargo}
          onRefreshData={handleRefreshAll}
        />
      )}

      {basePath.startsWith('/cargo/') && currentCargoItem && (
        <CargoDetail
          cargo={currentCargoItem}
          onBack={() => handleNavigate('/cargo')}
          onRefreshData={handleRefreshAll}
          onNavigate={handleNavigate}
        />
      )}

      {basePath === '/inventory' && (
        <InventoryIntelligence
          inventoryList={inventoryList}
          onNavigate={handleNavigate}
          onRefreshData={handleRefreshAll}
        />
      )}

      {basePath === '/assets' && (
        <AssetManagement
          assetsList={assetsList}
          onRefreshData={handleRefreshAll}
        />
      )}

      {basePath === '/personnel' && (
        <PersonnelMovement
          personnelList={personnelList}
          onRefreshData={handleRefreshAll}
          onNavigate={handleNavigate}
        />
      )}

      {basePath === '/movements' && (
        <MovementsPage />
      )}

      {(basePath === '/stations' || basePath.startsWith('/stations/')) && (
        <StationOverview
          initialStationId={basePath.startsWith('/stations/') ? basePath.replace('/stations/', '') : undefined}
          onNavigate={handleNavigate}
        />
      )}

      {currentPath === '/emergency' && (
        <EmergencyResponse
          incidentsList={incidentsList}
          onRefreshData={handleRefreshAll}
          onNavigate={handleNavigate}
        />
      )}

      {currentPath === '/simulations' && (
        <WhatIfSimulation
          onRefreshData={handleRefreshAll}
          onNavigate={handleNavigate}
        />
      )}

      {currentPath === '/alerts' && (
        <AlertsActionCenter
          alertsList={alertsList}
          actionsList={actionsList}
          onRefreshData={handleRefreshAll}
          onNavigate={handleNavigate}
        />
      )}

      {currentPath === '/analytics' && (
        <AnalyticsReports />
      )}

      {currentPath === '/organization' && (
        <OrganizationAdminPage
          onNavigate={handleNavigate}
          onSelectExpedition={(id) => {
            switchExpedition(id);
            handleNavigate('/dashboard');
          }}
        />
      )}

      {currentPath === '/optimization' && (
        <ResourceOptimization />
      )}
    </AppLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ExpeditionProvider>
        <MainApp />
      </ExpeditionProvider>
    </AuthProvider>
  );
}

export default App;

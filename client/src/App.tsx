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
import { ShieldAlert } from 'lucide-react';

function MainApp() {
  const [currentPath, setCurrentPath] = useState<string>('/');
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
    isAdmin,
    isStationManager,
    isExpeditionLeader,
    isTeamMember,
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
          else handleNavigate('/member');
        }}
      />
    );
  }

  // Find inspected cargo if on detail view
  const currentCargoItem =
    cargoList.find((c) => c.id.toLowerCase() === selectedCargoId.toLowerCase()) || cargoList[0];

  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={handleNavigate}
      onRefreshData={handleRefreshAll}
      activeAlertCount={dashboard?.kpi.activeAlerts ?? alertsList.filter((a) => a.status !== 'Resolved').length}
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

      {(currentPath === '/member' || currentPath === '/field') && (
        <TeamMemberWorkspace onNavigate={handleNavigate} />
      )}

      {currentPath === '/expeditions' && (
        <ExpeditionListPage
          onSelectExpedition={(id) => {
            switchExpedition(id);
            handleNavigate('/dashboard');
          }}
          onCreateNew={() => handleNavigate('/expeditions/new')}
        />
      )}

      {/* Critical Role Gate: ONLY ADMIN CAN CREATE AN EXPEDITION */}
      {currentPath === '/expeditions/new' && (
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

      {currentPath === '/expedition' && (
        <ExpeditionPlanning
          expedition={dashboard?.expedition || currentExpedition || null}
          onNavigate={handleNavigate}
        />
      )}

      {currentPath === '/cargo' && (
        <CargoTracking
          cargoList={cargoList}
          onSelectCargo={handleSelectCargo}
          onRefreshData={handleRefreshAll}
        />
      )}

      {currentPath.startsWith('/cargo/') && currentCargoItem && (
        <CargoDetail
          cargo={currentCargoItem}
          onBack={() => handleNavigate('/cargo')}
          onRefreshData={handleRefreshAll}
          onNavigate={handleNavigate}
        />
      )}

      {currentPath === '/inventory' && (
        <InventoryIntelligence
          inventoryList={inventoryList}
          onNavigate={handleNavigate}
          onRefreshData={handleRefreshAll}
        />
      )}

      {currentPath === '/assets' && (
        <AssetManagement
          assetsList={assetsList}
          onRefreshData={handleRefreshAll}
        />
      )}

      {currentPath === '/personnel' && (
        <PersonnelMovement
          personnelList={personnelList}
          onRefreshData={handleRefreshAll}
        />
      )}

      {currentPath === '/movements' && (
        <MovementsPage />
      )}

      {currentPath === '/stations' && (
        <StationOverview
          stations={dashboard?.stations || []}
          inventoryList={inventoryList}
          assetsList={assetsList}
          personnelList={personnelList}
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

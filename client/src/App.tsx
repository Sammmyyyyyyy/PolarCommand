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
        onEnterApp={() => handleNavigate('/dashboard')}
        onNavigatePage={(path) => handleNavigate(path)}
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
      {currentPath === '/dashboard' && (
        <CommandCenter
          summary={dashboard}
          onNavigate={handleNavigate}
          onSelectStation={(_id) => handleNavigate('/stations')}
          onSelectCargo={handleSelectCargo}
        />
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

      {currentPath === '/expeditions/new' && (
        <CreateExpeditionPage
          onCancel={() => handleNavigate('/expeditions')}
          onCreated={(expedition) => {
            switchExpedition(expedition.id);
            handleNavigate('/dashboard');
          }}
        />
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

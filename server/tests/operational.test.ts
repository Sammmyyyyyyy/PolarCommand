import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/config/database.js';
import { OrganizationService } from '../src/services/organization.service.js';
import { ExpeditionService } from '../src/services/expedition.service.js';
import { TaskService } from '../src/services/task.service.js';
import { CheckInService } from '../src/services/checkin.service.js';
import { CargoService } from '../src/services/cargo.service.js';
import { IncidentService } from '../src/services/incident.service.js';
import { AssetService } from '../src/services/asset.service.js';
import { SimulationService } from '../src/services/simulation.service.js';

describe('Operational Platform End-to-End Validation', () => {
  let orgId: string;
  let expeditionId: string;
  let stationId: string;
  let personnelId: string;
  let assetId: string;
  let cargoId: string;

  before(async () => {
    const org = await OrganizationService.getOrCreateDefaultOrganization();
    orgId = org.id;
  });

  test('1. Organization & 8-Step Expedition Commissioning Workflow', async () => {
    // Commission ARCTIC-2028 via the 8-step data structure
    const createdExp = await ExpeditionService.createExpedition({
      code: `ARC-${Date.now().toString().slice(-4)}`,
      title: 'Arctic Cryosphere & Climate Traverse',
      type: 'Scientific Climate Research',
      missionObjective: 'Ice shelf core profiling and atmospheric boundary layer monitoring.',
      organizationId: orgId,
      lifecycleStatus: 'PLANNED',
      priority: 'HIGH',
      startDate: new Date('2028-03-01'),
      endDate: new Date('2029-03-31'),
      origin: 'Tromsø Polar Logistics Base',
      destination: 'Ny-Ålesund Research Station',
      initialStations: [
        {
          name: 'Himadri Polar Research Base',
          code: 'HIMADRI',
          region: 'Svalbard',
          latitude: 78.92,
          longitude: 11.92,
          capacity: 25,
        },
      ],
      initialCrew: [
        {
          name: 'Dr. Maya Lin',
          role: 'Scientist',
          qualification: 'Glaciology PhD',
          stationIndex: 0,
        },
        {
          name: 'Tenzing Norgay Jr.',
          role: 'Engineer',
          qualification: 'Polar Vehicle Lead',
          stationIndex: 0,
        },
      ],
      initialAssets: [
        {
          name: 'PistenBully 300 Polar Track',
          assetCode: 'PB-ARC-01',
          type: 'Snowcat',
          stationIndex: 0,
          operatingHours: 150,
          maintenanceInterval: 2000,
        },
      ],
      initialCargo: [
        {
          cargoCode: 'FUEL-ARC-01',
          description: 'Arctic Grade Diesel 10,000L',
          category: 'Fuel',
          weightKg: 8500,
          quantity: 10000,
          priority: 'CRITICAL',
        },
      ],
      initialTasks: [
        {
          title: 'Establish Solar Array at Sector 4',
          description: 'Set up temporary photovoltaic monitoring arrays.',
          priority: 'MEDIUM',
          assignedCrewIndex: 0,
        },
      ],
    });

    assert.ok(createdExp);
    expeditionId = createdExp.id;
    assert.strictEqual(createdExp.lifecycleStatus, 'PLANNED');

    // Fetch stations and assets
    const stations = await prisma.station.findMany({ where: { expeditionId } });
    assert.strictEqual(stations.length, 1);
    stationId = stations[0].id;

    const people = await prisma.personnel.findMany({ where: { expeditionId } });
    assert.strictEqual(people.length, 2);
    personnelId = people[0].id;

    const assets = await prisma.asset.findMany({ where: { expeditionId } });
    assert.strictEqual(assets.length, 1);
    assetId = assets[0].id;

    const cargo = await prisma.cargo.findMany({ where: { expeditionId } });
    assert.strictEqual(cargo.length, 1);
    cargoId = cargo[0].id;

    // Publish Expedition (transitions to ACTIVE)
    const published = await ExpeditionService.publishExpedition(expeditionId);
    assert.strictEqual(published.lifecycleStatus, 'ACTIVE');
    assert.strictEqual(published.status, 'ACTIVE');
  });

  test('2. Task Lifecycle & Field Member Updates', async () => {
    // 1. Create a task
    const task = await TaskService.createTask(expeditionId, {
      title: 'Inspect Sea Ice Thickness at Fjord Mouth',
      description: 'Collect auger drill cores across 5 transect points.',
      priority: 'CRITICAL',
      stationId,
      assignedPersonnelId: personnelId,
      requiredAssetId: assetId,
    });

    assert.strictEqual(task.status, 'ASSIGNED');

    // 2. Field member marks IN_PROGRESS
    const inProgress = await TaskService.updateTaskStatus(task.id, 'IN_PROGRESS');
    assert.strictEqual(inProgress.status, 'IN_PROGRESS');

    // 3. Field member flags task as BLOCKED
    const blocked = await TaskService.updateTaskStatus(task.id, 'BLOCKED', {
      fieldObservations: 'Open lead detected in sea ice. Impassable with heavy equipment.',
    });
    assert.strictEqual(blocked.status, 'BLOCKED');

    // Verify alert generated for BLOCKED task
    const alert = await prisma.alert.findFirst({
      where: { expeditionId, title: { contains: 'TASK BLOCKED' } },
    });
    assert.ok(alert, 'Alert should be generated when critical task is blocked');

    // 4. Complete task
    const completed = await TaskService.updateTaskStatus(task.id, 'COMPLETED', {
      fieldObservations: 'Alternative route via shorefast ice completed successfully.',
    });
    assert.strictEqual(completed.status, 'COMPLETED');
    assert.ok(completed.completionTime !== null);

    // Verify required asset is freed back to available
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    assert.strictEqual(asset?.status, 'Operational');
  });

  test('3. Personnel Check-In & Accountability Tracking', async () => {
    // Record healthy check-in
    const checkInResult = await CheckInService.recordCheckIn(expeditionId, personnelId, {
      status: 'ON_TASK',
      location: 'Ny-Ålesund Weather Mast',
      notes: 'Operating anemometer calibration in nominal conditions.',
    });

    assert.ok(checkInResult.log);
    assert.strictEqual(checkInResult.log.status, 'ON_TASK');

    // Fetch personnel accountability summary
    const accountability = await CheckInService.getPersonnelAccountability(expeditionId);
    assert.strictEqual(accountability.summary.total, 2);
    assert.strictEqual(accountability.summary.onTask, 1);
    assert.ok(accountability.summary.accountabilityRate > 0);
  });

  test('4. Cargo Receiving at Station & Inventory Replenishment', async () => {
    // Initial inventory at Himadri
    const inv = await prisma.inventoryItem.findFirst({
      where: { expeditionId, stationId, category: 'Fuel' },
    });
    assert.ok(inv);
    const initialStock = inv.currentStock;

    // Station personnel receives the fuel cargo (receivedQuantity: 9800L due to transfer hose residue)
    const receiveResult = await CargoService.receiveCargo(cargoId, {
      receivedQuantity: 9800,
      conditionOnArrival: 'Intact, Minor Seal Residue',
      receivingNotes: 'Offloaded to Bulk Tank 1 without spillage.',
    });

    assert.strictEqual(receiveResult.cargo.status, 'DELIVERED');
    assert.strictEqual(receiveResult.cargo.receivedQuantity, 9800);

    // Verify inventory stock increased by 9800
    const updatedInv = await prisma.inventoryItem.findUnique({ where: { id: inv.id } });
    assert.strictEqual(updatedInv?.currentStock, initialStock + 9800);
  });

  test('5. Operational Cargo Delay Propagation Chain', async () => {
    // Create new shipment
    const cargo = await CargoService.createCargo(expeditionId, {
      cargoCode: 'MED-ARC-02',
      description: 'Emergency Field Trauma Supplies',
      category: 'Medicine',
      weightKg: 120,
      quantity: 50,
      priority: 'CRITICAL',
      destination: 'Himadri Polar Research Base',
    });

    const expBefore = await ExpeditionService.getExpedition(expeditionId);
    const initialRisk = expBefore?.overallRiskScore ?? 25;

    // Apply 48h delay
    const delayResult = await CargoService.applyOperationalCargoDelay(cargo.id, 48);
    assert.strictEqual(delayResult.cargo.delayHours, 48);
    assert.ok(delayResult.impact.newOverallRisk >= initialRisk);
    assert.ok(delayResult.impact.recommendedAction.includes('Himadri'));

    // Verify alert dispatched
    const activeAlerts = await prisma.alert.findMany({
      where: { expeditionId, status: 'ACTIVE' },
    });
    assert.ok(activeAlerts.length > 0);
  });

  test('6. Emergency SOS Beacon Workflow', async () => {
    const sosIncident = await IncidentService.triggerSos(expeditionId, {
      message: 'Snowcat threw track in crevasse field. Temperature dropping rapidly.',
      location: 'Svalbard East Ice Dome (Sector 7)',
      latitude: 78.85,
      longitude: 12.10,
    });

    assert.strictEqual(sosIncident.isSosEmergency, true);
    assert.strictEqual(sosIncident.severity, 'CRITICAL');
    assert.ok(sosIncident.responsePlanJson);

    // Verify critical alert created
    const sosAlert = await prisma.alert.findFirst({
      where: { expeditionId, title: { contains: 'EMERGENCY SOS BEACON' } },
    });
    assert.ok(sosAlert);
    assert.strictEqual(sosAlert.severity, 'CRITICAL');

    // Resolve incident
    const resolved = await IncidentService.resolveIncident(sosIncident.id, {
      resolutionNotes: 'Rescue snowcat retrieved crew. Vehicle secured and personnel returned to base.',
    });
    assert.strictEqual(resolved.status, 'Resolved');
  });

  test('7. Simulation Sandbox Isolation (Does NOT mutate live DB)', async () => {
    const cargo = await prisma.cargo.findFirst({ where: { expeditionId } });
    assert.ok(cargo);
    const initialDelay = cargo.delayHours;

    // Run simulation
    const simResult = await SimulationService.runSimulation({
      expeditionId,
      scenarioType: 'cargo-delay',
      cargoId: cargo.id,
      delayHours: 72,
    });

    assert.strictEqual(simResult.isCommittedToDatabase, false);

    // Verify live DB was NOT changed
    const unchangedCargo = await prisma.cargo.findUnique({ where: { id: cargo.id } });
    assert.strictEqual(unchangedCargo?.delayHours, initialDelay);

    // Now apply scenario
    await SimulationService.applyScenario(simResult.simulationId);

    // Verify live DB changed AFTER applyScenario
    const committedCargo = await prisma.cargo.findUnique({ where: { id: cargo.id } });
    assert.strictEqual(committedCargo?.delayHours, initialDelay + 72);
  });
});

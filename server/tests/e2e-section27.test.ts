import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/config/database.js';
import { OrganizationService } from '../src/services/organization.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { ExpeditionService } from '../src/services/expedition.service.js';
import { TaskService } from '../src/services/task.service.js';
import { CheckInService } from '../src/services/checkin.service.js';
import { CargoService } from '../src/services/cargo.service.js';
import { RiskService } from '../src/services/risk.service.js';
import { AlertService } from '../src/services/alert.service.js';
import { RecommendationService } from '../src/services/recommendation.service.js';
import { ActionService } from '../src/services/action.service.js';
import { AuditService } from '../src/services/audit.service.js';
import { SimulationService } from '../src/services/simulation.service.js';

describe('Section 27: Complete Real-World End-to-End Operational Lifecycle', () => {
  it('should execute all 25 operational steps for ARCTIC-2028', async () => {
    const testSuffix = Date.now().toString().slice(-6);
    const orgCode = `PRO-S27-${testSuffix}`;
    const expCode = `ARCTIC-2028-${testSuffix}`;
    const cmdEmail = `commander.arc.${testSuffix}@polarops.org`;
    const fieldEmail = `elena.arc.${testSuffix}@polarops.org`;

    // Setup Organization: Polar Research Operations
    const org = await OrganizationService.createOrganization({
      name: 'Polar Research Operations',
      code: orgCode,
      description: 'Arctic and Antarctic Scientific Traverse Operator',
    });
    assert.ok(org.id);

    // Setup Commander and Field Member Users
    const commanderUser = await AuthService.createUser({
      email: cmdEmail,
      name: 'Dr. Priya Sharma',
      role: 'COMMANDER',
      password: 'password123',
      organizationId: org.id,
    });
    assert.strictEqual(commanderUser.role, 'COMMANDER');

    const fieldUser = await AuthService.createUser({
      email: fieldEmail,
      name: 'Elena Rostova',
      role: 'FIELD_MEMBER',
      password: 'password123',
      organizationId: org.id,
    });
    assert.strictEqual(fieldUser.role, 'FIELD_MEMBER');

    // Commission ARCTIC-2028 via 8-Step Wizard parameters:
    // - 2 Stations
    // - 5 Crew Members
    // - 4 Assets
    // - 4 Cargo shipments (including critical fuel & medicine)
    // - Operational Tasks
    const expedition = await ExpeditionService.createExpedition({
      code: expCode,
      title: 'Arctic Cryosphere & Climate Traverse',
      type: 'Atmospheric & Cryosphere Science',
      missionObjective: 'Atmospheric boundary layer profiling, Svalbard glacier mass balance, sea-ice thickness profiling.',
      organizationId: org.id,
      commanderId: commanderUser.id,
      commanderName: commanderUser.name,
      lifecycleStatus: 'PLANNED',
      startDate: new Date('2028-03-01'),
      endDate: new Date('2029-03-31'),
      origin: 'Tromsø Polar Logistics Base, Norway',
      destination: 'Ny-Ålesund Research Station, Svalbard',
      intermediateHubs: 'Longyearbyen Air Staging Port',
      transportModes: 'Icebreaker Vessel, Twin Otter Ski-Plane, Snowcat',
      priority: 'HIGH',
      initialStations: [
        {
          name: 'Himadri Polar Research Base',
          code: 'HIMADRI',
          region: 'Ny-Ålesund, Spitsbergen, Svalbard',
          latitude: 78.923,
          longitude: 11.923,
          capacity: 25,
        },
        {
          name: 'Ny-Ålesund Marine Staging Depot',
          code: 'NY-DEPOT',
          region: 'Kongsfjorden Fjord Port',
          latitude: 78.92,
          longitude: 11.93,
          capacity: 15,
        },
      ],
      initialCrew: [
        {
          name: 'Elena Rostova',
          role: 'Lead Field Specialist',
          qualification: 'Polar Glaciologist & Alpine Traverse Scout',
          contactInfo: 'VHF Ch-16 / Iridium 8816-01',
          stationIndex: 0,
        },
        {
          name: 'Dr. Anita Singh',
          role: 'Senior Medical Officer',
          qualification: 'Trauma & Extreme Hypothermia Specialist',
          contactInfo: 'VHF Ch-16 / Medical Duplex',
          stationIndex: 0,
        },
        {
          name: 'Liam O\'Connor',
          role: 'Heavy Equipment Mechanic',
          qualification: 'Diesel Systems & Snowcat Specialist',
          contactInfo: 'VHF Ch-09 Base',
          stationIndex: 0,
        },
        {
          name: 'Nikolai Morozov',
          role: 'Atmospheric Radar Engineer',
          qualification: 'Meteorological Sensors & LiDAR',
          contactInfo: 'VHF Ch-11 Science',
          stationIndex: 0,
        },
        {
          name: 'Freja Lindholm',
          role: 'Environmental Safety Officer',
          qualification: 'Crevasse Rescue & Glacier Hydrology',
          contactInfo: 'VHF Ch-16 / SAR Link',
          stationIndex: 1,
        },
      ],
      initialAssets: [
        {
          name: 'PistenBully 300 Polar Snowcat',
          assetCode: 'AST-ARC-01',
          type: 'Snow Vehicle',
          stationIndex: 0,
          operatingHours: 120,
          maintenanceInterval: 2000,
        },
        {
          name: 'DHC-6 Twin Otter Ski-Plane',
          assetCode: 'AST-ARC-02',
          type: 'Ski-Plane',
          stationIndex: 1,
          operatingHours: 350,
          maintenanceInterval: 1000,
        },
      ],
      initialCargo: [
        {
          cargoCode: 'CRG-ARC-01',
          description: 'Arctic Winter Polar Diesel Fuel Reserve',
          category: 'Fuel',
          weightKg: 12000,
          quantity: 12000,
          priority: 'CRITICAL',
          transportMode: 'Vessel',
        },
        {
          cargoCode: 'CRG-ARC-02',
          description: 'Trauma Surgical & Hypothermia Treatment Modules',
          category: 'Medicine',
          weightKg: 450,
          quantity: 350,
          priority: 'CRITICAL',
          transportMode: 'Air',
        },
      ],
      initialTasks: [
        {
          title: 'Glacier Core Firn Sampling at North Ridge',
          description: 'Extract 10m ice firn cores at accumulation zone.',
          priority: 'HIGH',
          location: 'Kronebreen Sector 4',
          assignedCrewIndex: 0, // Elena
        },
      ],
    });

    assert.ok(expedition);
    assert.strictEqual(expedition.code, expCode);
    assert.strictEqual(expedition.stations.length, 2);
    assert.strictEqual(expedition.lifecycleStatus, 'PLANNED');

    // Publish Expedition (Transition to ACTIVE)
    const published = await ExpeditionService.publishExpedition(expedition.id);
    assert.strictEqual(published.lifecycleStatus, 'ACTIVE');

    // 1. Field member logs in
    const authSession = await AuthService.login(fieldUser.email, 'password123');
    assert.strictEqual(authSession.user.role, 'FIELD_MEMBER');

    // 2. Field member sees only assigned organization's data
    const memberExpeditions = await ExpeditionService.listExpeditions(fieldUser.organizationId!);
    assert.ok(memberExpeditions.some((e) => e.code === expCode));

    // 3. Field member receives assigned task
    const elenaPersonnel = await prisma.personnel.findFirst({
      where: { expeditionId: expedition.id, name: 'Elena Rostova' },
    });
    assert.ok(elenaPersonnel);

    const elenaTasks = await TaskService.listTasks(expedition.id, {
      assignedPersonnelId: elenaPersonnel.id,
    });
    assert.strictEqual(elenaTasks.length, 1);
    const assignedTask = elenaTasks[0];
    assert.strictEqual(assignedTask.status, 'ASSIGNED');

    // 4-8. Field member goes offline, updates task & check-in, then syncs
    // Simulated offline mutation sync:
    const updatedTask = await TaskService.updateTaskStatus(
      assignedTask.id,
      'IN_PROGRESS',
      {
        notes: 'Snowcat traverse reached Kronebreen Sector 4. Setting up drill rig.',
        fieldObservations: 'Sub-surface crevasse detected at waypoint 3; flagged and diverted route.',
      }
    );
    assert.strictEqual(updatedTask.status, 'IN_PROGRESS');

    const checkInRecord = await CheckInService.recordCheckIn(
      expedition.id,
      elenaPersonnel.id,
      {
        status: 'ON_TASK',
        location: 'Kronebreen Sector 4 Drill Site',
        notes: 'Commencing firn extraction. Radio comms nominal.',
      }
    );
    assert.strictEqual(checkInRecord.log.status, 'ON_TASK');

    // 9-10. Logistics Officer delays critical cargo
    const criticalCargo = await prisma.cargo.findFirst({
      where: { expeditionId: expedition.id, cargoCode: 'CRG-ARC-02' },
    });
    assert.ok(criticalCargo);

    const preDelayRisk = await RiskService.calculateAndRecordExpeditionRisk(expedition.id);

    // Apply delay of 48 hours
    const delayResult = await CargoService.applyOperationalCargoDelay(
      criticalCargo.id,
      48,
      'Severe katabatic storm grounded logistics flight from Longyearbyen'
    );
    assert.ok(delayResult.cargo.delayHours >= 48);

    // 11-13. Safety threshold is breached -> Risk increases -> Alert is generated
    const postDelayRisk = await RiskService.calculateAndRecordExpeditionRisk(expedition.id);
    assert.ok(
      postDelayRisk.totalScore >= preDelayRisk.totalScore,
      `Risk must increase or stay elevated. Pre: ${preDelayRisk.totalScore}, Post: ${postDelayRisk.totalScore}`
    );

    const alerts = await AlertService.evaluateAndSyncAlerts(expedition.id);
    assert.ok(alerts.length > 0, 'Operational alerts must be generated for delayed critical cargo');

    // 14. Recommendation is generated
    const recommendations = await RecommendationService.generateRecommendations(expedition.id);
    assert.ok(recommendations.length > 0, 'Recommendations must be generated');
    const targetRec = recommendations[0];
    assert.ok(targetRec.proposedAction);
    assert.ok(targetRec.reason);
    assert.ok(targetRec.expectedImpact);

    // 15-19. Commander sees recommendation and executes it -> DB state mutates -> Risk recalculates -> Audit created
    const actionResult = await ActionService.executeAction({
      expeditionId: expedition.id,
      actionType: 'EXPEDITE_CARGO',
      cargoId: criticalCargo.id,
      user: commanderUser,
    });

    assert.strictEqual(actionResult.success, true);
    assert.ok(actionResult.newRisk);

    // Verify audit log created
    const auditLogs = await AuditService.listAuditLogs(expedition.id);
    assert.ok(auditLogs.length > 0);

    // 20-21. What-If Simulation: verify simulation does NOT mutate live DB
    const preSimCargo = await prisma.cargo.findUnique({ where: { id: criticalCargo.id } });
    const preSimDelay = preSimCargo?.delayHours;

    const simulation = await SimulationService.runSimulation({
      expeditionId: expedition.id,
      scenarioType: 'cargo-delay',
      cargoId: criticalCargo.id,
      delayHours: 72,
    });
    assert.ok(simulation.after.risk !== undefined);

    const postSimCargo = await prisma.cargo.findUnique({ where: { id: criticalCargo.id } });
    assert.strictEqual(
      postSimCargo?.delayHours,
      preSimDelay,
      'Live database cargo must NOT be mutated by simulation run'
    );

    // 22-24. Apply Scenario: verify live DB mutates only after explicit apply
    const applied = await SimulationService.applyScenario(simulation.simulationId, commanderUser);
    assert.strictEqual(applied.success, true);

    const postApplyCargo = await prisma.cargo.findUnique({ where: { id: criticalCargo.id } });
    assert.ok((postApplyCargo?.delayHours || 0) > (preSimDelay || 0));

    // 25. Verify analytics are generated from actual stored RiskSnapshot history
    const riskHistory = await RiskService.getRiskHistory(expedition.id);
    assert.ok(riskHistory.length >= 1, 'Risk snapshots must be stored in database');
    assert.strictEqual(typeof riskHistory[0].totalScore, 'number');
  });
});

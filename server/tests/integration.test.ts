import { describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/config/database.js';
import { seedDemoData } from '../src/seed/demo-data.js';
import { CargoService } from '../src/services/cargo.service.js';
import { RecommendationService } from '../src/services/recommendation.service.js';
import { ActionService } from '../src/services/action.service.js';

describe('4. End-to-End Decision Support & Event Propagation Integration Test', () => {
  it('should execute complete operational flow: Delay -> Impact -> Alert -> Recommendation -> Action -> Recovery', async () => {
    // 1. Ensure seed data
    await seedDemoData();
    const expedition = await prisma.expedition.findUnique({ where: { code: 'INPEX-2027' } });
    assert.ok(expedition, 'INPEX-2027 should exist');

    const cargoMed = await prisma.cargo.findFirst({
      where: { expeditionId: expedition.id, cargoCode: 'MED-024' },
    });
    assert.ok(cargoMed, 'MED-024 cargo should exist');

    // Reset cargo delay and inventory for clean test run
    await prisma.cargo.update({
      where: { id: cargoMed.id },
      data: { delayHours: 0, status: 'In Transit' },
    });
    await prisma.inventoryItem.updateMany({
      where: { expeditionId: expedition.id, category: 'Medicine', station: { code: 'BHARATI' } },
      data: { currentStock: 220, riskStatus: 'Normal' },
    });
    await prisma.inventoryItem.updateMany({
      where: { expeditionId: expedition.id, category: 'Medicine', station: { code: 'MAITRI' } },
      data: { currentStock: 500, riskStatus: 'Normal' },
    });

    const baselineRisk = expedition.overallRiskScore;

    // 2. Simulate +48h delay
    const delayResult = await CargoService.simulateCargoDelay(cargoMed.id, 48);
    assert.strictEqual(delayResult.cargo.status, 'Delayed');
    assert.strictEqual(delayResult.cargo.delayHours, 48);
    assert.ok(delayResult.impact.newOverallRisk >= baselineRisk, 'Risk should increase after delay');

    // 3. Verify Alerts created
    const activeAlerts = await prisma.alert.findMany({
      where: { expeditionId: expedition.id, status: 'ACTIVE' },
    });
    assert.ok(activeAlerts.length > 0, 'Active alert should be generated');

    // 4. Generate recommendations
    const recs = await RecommendationService.generateRecommendations(expedition.id);
    const reallocationRec = recs.find((r) => r.type === 'INVENTORY_REALLOCATION');
    assert.ok(reallocationRec, 'Reallocation recommendation should be formulated from surplus station');
    assert.strictEqual(reallocationRec.payload.inventoryCategory, 'Medicine');

    // 5. Execute Action (Reallocation)
    const actionResult = await ActionService.executeAction({
      expeditionId: expedition.id,
      actionType: 'INVENTORY_REALLOCATION',
      donorStationId: reallocationRec.payload.donorStationId,
      recipientStationId: reallocationRec.payload.recipientStationId,
      inventoryCategory: 'Medicine',
      transferQuantity: reallocationRec.payload.transferQuantity || 150,
      title: reallocationRec.title,
    });

    assert.strictEqual(actionResult.success, true);
    assert.ok(actionResult.executionResult.donor.current < actionResult.executionResult.donor.previous, 'Donor stock must decrease');
    assert.ok(actionResult.executionResult.recipient.current > actionResult.executionResult.recipient.previous, 'Recipient stock must increase');

    // 6. Verify risk recovered
    assert.ok(actionResult.newRisk.totalScore <= delayResult.impact.newOverallRisk, 'Risk should decrease after action');

    // 7. Verify Audit Log recorded
    const auditLogs = await prisma.auditLog.findMany({
      where: { expeditionId: expedition.id, action: 'INVENTORY_REALLOCATION' },
    });
    assert.ok(auditLogs.length > 0, 'Audit log should record the transaction');
  });

  it('should support dynamic commissioning of a new expedition and generic risk operations', async () => {
    // Clean any previous test run
    await prisma.expedition.deleteMany({ where: { code: 'ARCTIC-2028' } });

    const commander = await prisma.user.findFirst({ where: { role: 'COMMANDER' } });
    assert.ok(commander, 'Commander must exist');

    // Commission new expedition from scratch
    const newExp = await prisma.expedition.create({
      data: {
        code: 'ARCTIC-2028',
        title: 'Arctic Cryosphere & Climate Traverse',
        type: 'Scientific Research',
        missionObjective: 'Svalbard glacier profiling and atmospheric observation',
        commanderId: commander.id,
        commanderName: commander.name,
        status: 'ACTIVE',
        startDate: new Date('2028-03-01'),
        endDate: new Date('2029-03-31'),
        origin: 'Tromsø Polar Logistics Base',
        destination: 'Ny-Ålesund, Svalbard',
        priority: 'HIGH',
        overallRiskScore: 25,
        stations: {
          create: [
            {
              name: 'Himadri Polar Research Base',
              code: 'HIMADRI',
              region: 'Ny-Ålesund, Svalbard',
              latitude: 78.923,
              longitude: 11.923,
              status: 'Operational',
              capacity: 25,
              currentRisk: 15,
            },
          ],
        },
      },
      include: { stations: true },
    });

    assert.ok(newExp.id, 'New expedition must be created');
    const himadri = newExp.stations[0];

    // Add inventory
    const fuelItem = await prisma.inventoryItem.create({
      data: {
        expeditionId: newExp.id,
        stationId: himadri.id,
        category: 'Fuel',
        itemName: 'Jet A-1 Polar Fuel',
        currentStock: 5000,
        unit: 'Liters',
        dailyUsage: 250,
        safetyThresholdDays: 14,
        riskStatus: 'Normal',
      },
    });

    // Add cargo linked to inventory
    const cargo = await prisma.cargo.create({
      data: {
        expeditionId: newExp.id,
        cargoCode: 'FUEL-999',
        category: 'Fuel',
        description: 'Emergency Aviation Fuel Resupply Drum Stash',
        weightKg: 4000,
        origin: 'Tromsø Polar Logistics Base',
        destination: himadri.name,
        currentLocation: 'Barents Sea Transit',
        transportMode: 'Vessel',
        status: 'In Transit',
        priority: 'HIGH',
        departureDate: new Date('2028-03-10'),
        eta: new Date('2028-03-25'),
        delayHours: 0,
        riskScore: 20,
        riskLevel: 'LOW',
      },
    });

    // Add personnel
    const person = await prisma.personnel.create({
      data: {
        expeditionId: newExp.id,
        memberId: 'PER-901',
        name: 'Dr. John Doe',
        role: 'Scientist',
        qualification: 'Atmospheric Physics, Ph.D.',
        currentLocation: himadri.name,
        emergencyAvailability: 'Available',
        contactInfo: 'himadri-radio-ch2',
        status: 'At Station',
      },
    });

    assert.ok(cargo.id && fuelItem.id && person.id);

    // Simulate delay on FUEL-999
    const delayRes = await CargoService.simulateCargoDelay(cargo.id, 72);
    assert.strictEqual(delayRes.cargo.delayHours, 72);
    assert.strictEqual(delayRes.cargo.status, 'Delayed');

    // Verify alert creation for the new expedition
    const alerts = await prisma.alert.findMany({
      where: { expeditionId: newExp.id },
    });
    assert.ok(alerts.length > 0, 'Generic alert engine should create alert for custom expedition');

    // Clean up test expedition
    await prisma.cargo.deleteMany({ where: { expeditionId: newExp.id } });
    await prisma.inventoryItem.deleteMany({ where: { expeditionId: newExp.id } });
    await prisma.personnel.deleteMany({ where: { expeditionId: newExp.id } });
    await prisma.alert.deleteMany({ where: { expeditionId: newExp.id } });
    await prisma.station.deleteMany({ where: { expeditionId: newExp.id } });
    await prisma.expedition.delete({ where: { id: newExp.id } });
  });
});


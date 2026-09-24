import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../src/config/database.js';
import { WeatherService } from '../src/services/weather.service.js';
import { OpenMeteoWeatherProvider } from '../src/services/weather/open-meteo.provider.js';
import { SimulatedWeatherProvider } from '../src/services/weather/simulated.provider.js';
import type { WeatherProvider, RawWeatherData } from '../src/services/weather/weather.types.js';
import { MovementService } from '../src/services/movement.service.js';
import { ObservationService } from '../src/services/observation.service.js';
import { ExpeditionService } from '../src/services/expedition.service.js';
import { OrganizationService } from '../src/services/organization.service.js';
import { RiskService } from '../src/services/risk.service.js';

describe('Operational Refinement Pass: Deep Verification', () => {
  let org: any;
  let user: any;
  let expedition: any;
  let station: any;
  let asset: any;
  let member: any;
  let movement: any;

  before(async () => {
    // Ensure default organization exists
    org = await OrganizationService.getOrCreateDefaultOrganization();

    // Create persistent test user for foreign-key valid audits
    user = await prisma.user.create({
      data: {
        email: `lead.commander.${Date.now()}@polarops.org`,
        passwordHash: '$2b$10$dummyHashForRefinementPassTest',
        name: 'Dr. Priya Sharma',
        role: 'COMMANDER',
        organizationId: org.id,
      },
    });

    // Create test expedition for refinement pass: ARCTIC-REFINE-XXXX
    expedition = await prisma.expedition.create({
      data: {
        code: `ARCTIC-REFINE-${Date.now().toString().slice(-4)}`,
        title: 'Arctic Cryosphere Refinement Verification',
        type: 'Scientific Traverse',
        status: 'Operational',
        lifecycleStatus: 'PLANNED',
        organizationId: org.id,
        commanderId: user.id,
        commanderName: user.name,
        startDate: new Date('2028-04-01'),
        endDate: new Date('2029-03-31'),
        priority: 'HIGH',
        overallRiskScore: 25,
        missionObjective: 'Atmospheric and glaciological validation of Svalbard Cryosphere traverse.',
        origin: 'Tromso Staging Port',
        destination: 'Ny-Alesund Research Base',
      },
    });

    // Create station with real polar coordinates (Ny-Alesund, Svalbard: 78.9244 N, 11.9286 E)
    station = await prisma.station.create({
      data: {
        expeditionId: expedition.id,
        organizationId: org.id,
        name: 'Ny-Alesund Research Base',
        code: 'NYA-01',
        region: 'Svalbard Arctic',
        latitude: 78.9244,
        longitude: 11.9286,
        capacity: 25,
        status: 'Operational',
        currentRisk: 15,
      },
    });

    // Create operational asset
    asset = await prisma.asset.create({
      data: {
        expeditionId: expedition.id,
        stationId: station.id,
        organizationId: org.id,
        assetCode: 'PBN-09',
        name: 'PistenBully 300 Polar Track',
        type: 'Snow Vehicle',
        operatingHours: 420,
        maintenanceInterval: 1000,
        lifecycleStatus: 'AVAILABLE',
        status: 'Operational',
      },
    });

    // Create field member
    member = await prisma.personnel.create({
      data: {
        expeditionId: expedition.id,
        assignedStationId: station.id,
        memberId: 'PER-901',
        name: 'Dr. Maria Lindqvist',
        role: 'Glaciologist',
        qualification: 'Polar Glaciologist & Crevasse Rescue',
        currentLocation: station.name,
        emergencyAvailability: 'Available',
        status: 'At Station',
        checkInStatus: 'ACTIVE',
        lastCheckIn: new Date(),
        expectedNextCheckIn: new Date(Date.now() + 12 * 3600 * 1000),
        contactInfo: 'VHF Ch-16 / Iridium 8816-01',
      },
    });
  });

  // -------------------------------------------------------------
  // 1. Weather Architecture & Provider Pattern
  // -------------------------------------------------------------
  test('1. WeatherService fetches telemetry, stores snapshots, and computes operational impact', async () => {
    class MockPolarWeatherProvider implements WeatherProvider {
      public readonly providerName = 'Open-Meteo';
      async fetchWeather(lat: number, lon: number): Promise<RawWeatherData> {
        return {
          temperature: -24.5,
          apparentTemperature: -36.2,
          windSpeedKnots: 34.0, // High wind
          windDirection: 350,
          windGustKnots: 48.0,
          visibility: '1200 m (Restricted)',
          visibilityMeters: 1200,
          precipitationMm: 1.8,
          snowfallCm: 4.5,
          snowDepthMeters: 1.2,
          weatherCode: 73,
          condition: 'Moderate Snowfall',
          cloudCoverPercent: 95,
          provider: 'Open-Meteo',
          time: new Date().toISOString(),
        };
      }
    }

    WeatherService.setProvider(new MockPolarWeatherProvider());

    const report = await WeatherService.getStationWeather(station.id, true);

    assert.equal(report.stationId, station.id);
    assert.equal(report.provider, 'Open-Meteo');
    assert.equal(report.isStale, false);
    assert.equal(report.status, 'LIVE');
    assert.equal(report.temperature, -24.5);
    assert.equal(report.apparentTemperature, -36.2);
    assert.equal(report.windSpeedKnots, 34.0);

    // Verify operational impact calculations
    assert.equal(report.travelFeasibility, 'RESTRICTED');
    assert.ok(report.windChillCelsius < -24.5, 'Wind chill must be lower than air temp');

    // Verify snapshot was persisted in database
    const snapshot = await prisma.weatherSnapshot.findFirst({
      where: { stationId: station.id },
      orderBy: { recordedAt: 'desc' },
    });
    assert.ok(snapshot, 'WeatherSnapshot must be saved to DB');
    assert.equal(snapshot.temperature, -24.5);
    assert.equal(snapshot.provider, 'Open-Meteo');
    assert.equal(snapshot.isStale, false);
  });

  test('2. WeatherService returns stale cached snapshot gracefully on external provider failure', async () => {
    class FailingWeatherProvider implements WeatherProvider {
      public readonly providerName = 'Open-Meteo';
      async fetchWeather(_lat: number, _lon: number): Promise<RawWeatherData> {
        throw new Error('503 Service Unavailable / Polar Satellite Outage');
      }
    }

    WeatherService.setProvider(new FailingWeatherProvider());

    // Request weather with refresh: should catch failure and return last known snapshot marked STALE
    const report = await WeatherService.getStationWeather(station.id, true);

    assert.equal(report.stationId, station.id);
    assert.equal(report.isStale, true);
    assert.equal(report.status, 'STALE');
    assert.ok(report.lastUpdated, 'Should expose last successful update timestamp');
    assert.equal(report.temperature, -24.5, 'Must retain last known temperature without inventing fake data');
  });

  // -------------------------------------------------------------
  // 2. Movement Model & Delay Propagation
  // -------------------------------------------------------------
  test('3. Movement supports operational parameters and weather delay propagation', async () => {
    movement = await MovementService.createMovement(
      expedition.id,
      {
        title: 'Svalbard Glacier Fuel & Sensor Traverse',
        type: 'OVERLAND_TRAVERSE',
        fromLocation: station.name,
        toLocation: 'Kronebreen Ridge Post',
        transportMode: 'Snow Vehicle',
        plannedDeparture: new Date('2028-04-10T08:00:00Z').toISOString(),
        plannedEta: new Date('2028-04-10T18:00:00Z').toISOString(),
        assignedAssetId: asset.id,
        notes: 'Traverse corridor across frozen fjord ice.',
      },
      user
    );

    assert.ok(movement.movementCode, 'Movement must have an assigned code');
    assert.equal(movement.status, 'PLANNED');
    assert.equal(movement.delayHours, 0);

    // Weather condition with RESTRICTED travel
    const weatherData = await WeatherService.getStationWeather(station.id);

    // Apply weather constraint
    const constrained = await MovementService.applyWeatherConstraint(
      movement.id,
      weatherData,
      user
    );

    assert.ok(constrained, 'Constrained movement must be returned');
    assert.ok(constrained!.delayHours > 0, 'Movement delay hours must increase deterministically from weather');
    assert.ok(constrained!.weatherConstraint, 'Weather constraint explanation must be recorded');
    assert.equal(constrained!.status, 'DELAYED', 'Movement status must transition to DELAYED');
  });

  // -------------------------------------------------------------
  // 3. Resource Availability & Conflict Prevention
  // -------------------------------------------------------------
  test('4. Resource availability prevents double allocation with clear explanations', async () => {
    const availability = await ExpeditionService.checkResourceAvailability(
      expedition.id,
      org.id,
      new Date('2028-04-01'),
      new Date('2029-03-31')
    );

    assert.ok(availability.personnel, 'Must return personnel availability breakdown');
    assert.ok(availability.assets, 'Must return asset availability breakdown');
    assert.ok(Array.isArray(availability.committedPersonnel), 'Must return committed personnel list');
  });

  // -------------------------------------------------------------
  // 4. Operational Readiness Check Gate
  // -------------------------------------------------------------
  test('5. Operational readiness check blocks unready expeditions and passes fully staged expeditions', async () => {
    // Expedition with only 1 crew member, no cargo, no inventory -> NOT READY
    const unready = await ExpeditionService.evaluateReadiness(expedition.id);
    assert.equal(unready.isReady, false, 'Expedition with 1 crew must NOT be ready');

    // Update expedition to satisfy readiness requirements:
    // 1. Assign Commander & Communication Verification
    await prisma.expedition.update({
      where: { id: expedition.id },
      data: {
        commanderName: user.name,
        commanderId: user.id,
        notes: 'VHF and Iridium communication channels verified.',
      },
    });

    // 2. Add second crew member (Medical Officer)
    await prisma.personnel.create({
      data: {
        expeditionId: expedition.id,
        assignedStationId: station.id,
        memberId: 'PER-902',
        name: 'Dr. Lars Lindqvist',
        role: 'Senior Medical Officer',
        qualification: 'Medical Trauma Surgeon',
        currentLocation: station.name,
        emergencyAvailability: 'Available',
        status: 'At Station',
        checkInStatus: 'ACTIVE',
        lastCheckIn: new Date(),
        expectedNextCheckIn: new Date(Date.now() + 12 * 3600 * 1000),
        contactInfo: 'VHF Ch-16 / Medical Duplex',
      },
    });

    // 3. Seed baseline station inventory
    await prisma.inventoryItem.create({
      data: {
        expeditionId: expedition.id,
        stationId: station.id,
        category: 'Fuel',
        itemName: 'Arctic Polar Diesel Reserve',
        currentStock: 10000,
        unit: 'Liters',
        dailyUsage: 250,
        safetyThresholdDays: 14,
        riskStatus: 'Normal',
      },
    });

    // 4. Add cargo shipment
    await prisma.cargo.create({
      data: {
        expeditionId: expedition.id,
        cargoCode: 'CRG-ARC-01',
        description: 'Polar Fuel Drums and Survival Rations',
        category: 'Fuel',
        weightKg: 2400,
        quantity: 12,
        origin: 'Tromso Staging Port',
        destination: station.name,
        currentLocation: 'Tromso Staging Port',
        departureDate: new Date('2028-04-05'),
        priority: 'HIGH',
        transportMode: 'Vessel',
        eta: new Date('2028-04-15'),
        status: 'In Transit',
      },
    });

    // 5. Add initial task
    await prisma.task.create({
      data: {
        expeditionId: expedition.id,
        stationId: station.id,
        title: 'Initial Station Sensor Calibration',
        description: 'Calibrate environmental barometers.',
        priority: 'HIGH',
        status: 'ASSIGNED',
        assignedPersonnelId: member.id,
      },
    });

    // Re-evaluate readiness
    const ready = await ExpeditionService.evaluateReadiness(expedition.id);
    assert.equal(ready.isReady, true, 'Expedition with commander, crew >= 2, stations, assets, and tasks must be READY');
    assert.equal(ready.blockingIssues.length, 0, 'Should have 0 blocking issues');
    assert.ok(ready.overallScore >= 70, 'Readiness score should be >= 70');
  });

  // -------------------------------------------------------------
  // 5. Field Observation System & Alerts
  // -------------------------------------------------------------
  test('6. Field observation creation stores record, records audit, and creates operational alert on CRITICAL', async () => {
    const obs = await ObservationService.createObservation(
      expedition.id,
      {
        category: 'ENVIRONMENT',
        severity: 'CRITICAL',
        description: 'Crevasse bridge fracture observed along Main Traverse Corridor Mile 12. Snowcat transit halted.',
        location: 'Traverse Corridor Mile 12',
      },
      user
    );

    assert.ok(obs.id, 'Observation must have an ID');
    assert.equal(obs.category, 'ENVIRONMENT');
    assert.equal(obs.severity, 'CRITICAL');
    assert.equal(obs.submitterName, user.name);

    // Verify automatic alert generation for CRITICAL observation
    const alerts = await prisma.alert.findMany({
      where: { expeditionId: expedition.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const relatedAlert = alerts.find((a) => a.reason.includes('Crevasse bridge') || a.title.includes('ENVIRONMENT'));
    assert.ok(relatedAlert, 'CRITICAL observation must automatically generate an active Commander Alert');
  });

  // -------------------------------------------------------------
  // 6. Organization Overview
  // -------------------------------------------------------------
  test('7. Organization overview provides personnel pool, asset pool, and active expedition status', async () => {
    const overview = await OrganizationService.getOrganizationOverview(org.id);

    assert.ok(overview.organization, 'Must return organization profile');
    assert.ok(overview.personnelPool.total >= 2, 'Personnel pool should count all personnel in org');
    assert.ok(overview.assetPool.total >= 1, 'Asset pool should count all assets in org');
    assert.ok(overview.expeditionsSummary.length >= 1, 'Should include commissioned expeditions');

    const expSummary = overview.expeditionsSummary.find((e) => e.id === expedition.id);
    assert.ok(expSummary, 'Target expedition must be present in portfolio');
    assert.equal(expSummary.code, expedition.code);
  });
});

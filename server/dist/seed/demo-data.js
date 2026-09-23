import { prisma } from '../config/database.js';
import { AuthService } from '../services/auth.service.js';
import { RiskService } from '../services/risk.service.js';
import { AlertService } from '../services/alert.service.js';
export async function seedDemoData() {
    console.log('[SEED] Starting demo data initialization for POLAR COMMAND...');
    // 1. Seed Users
    await AuthService.seedDefaultUsers();
    const commanderUser = await prisma.user.findFirst({ where: { role: 'COMMANDER' } });
    // 2. Check if INPEX-2027 exists
    let expedition = await prisma.expedition.findUnique({
        where: { code: 'INPEX-2027' },
    });
    if (!expedition) {
        expedition = await prisma.expedition.create({
            data: {
                code: 'INPEX-2027',
                title: '44th Indian Antarctic Expedition',
                type: 'Scientific Research & Inter-Station Polar Logistics',
                missionObjective: 'Climate change atmospheric observation, ice sheet mass balance, and winter-over logistics sustainment.',
                commanderId: commanderUser?.id || null,
                commanderName: commanderUser?.name || 'Dr. Rajesh Nair',
                status: 'ACTIVE',
                startDate: new Date('2026-11-01'),
                endDate: new Date('2027-11-30'),
                origin: 'NCPOR Logistics Hub, Goa / Mumbai Port',
                destination: 'Bharati Station & Maitri Station, East Antarctica',
                intermediateHubs: 'Cape Town Transit Berth 4',
                transportModes: 'Vessel (MV Polar Queen), Ski-Plane (Twin Otter), PistenBully Snowcat',
                priority: 'CRITICAL',
                notes: 'National Antarctic mission operated under National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences.',
                overallRiskScore: 38,
            },
        });
        console.log('[SEED] Created root expedition: INPEX-2027');
    }
    const expeditionId = expedition.id;
    // 3. Seed Stations
    let bharati = await prisma.station.findFirst({
        where: { expeditionId, code: 'BHARATI' },
    });
    if (!bharati) {
        bharati = await prisma.station.create({
            data: {
                expeditionId,
                name: 'Bharati Station',
                code: 'BHARATI',
                region: 'Larsemann Hills, Princess Elizabeth Land',
                latitude: -69.407,
                longitude: 76.191,
                capacity: 45,
                status: 'Operational',
                currentRisk: 34,
            },
        });
        await prisma.weatherSnapshot.create({
            data: {
                stationId: bharati.id,
                temperature: -18.5,
                windSpeedKnots: 24,
                condition: 'Clear, Katabatic Winds',
                visibility: '15 km (Good)',
            },
        });
    }
    let maitri = await prisma.station.findFirst({
        where: { expeditionId, code: 'MAITRI' },
    });
    if (!maitri) {
        maitri = await prisma.station.create({
            data: {
                expeditionId,
                name: 'Maitri Station',
                code: 'MAITRI',
                region: 'Schirmacher Oasis, Queen Maud Land',
                latitude: -70.766,
                longitude: 11.732,
                capacity: 35,
                status: 'Operational',
                currentRisk: 28,
            },
        });
        await prisma.weatherSnapshot.create({
            data: {
                stationId: maitri.id,
                temperature: -14.2,
                windSpeedKnots: 18,
                condition: 'Partly Cloudy',
                visibility: '12 km',
            },
        });
    }
    // 4. Seed Personnel
    const personnelCount = await prisma.personnel.count({ where: { expeditionId } });
    if (personnelCount === 0) {
        const personnelData = [
            {
                memberId: 'PER-001',
                name: 'Dr. Rajesh Nair',
                role: 'Commander',
                qualification: 'Atmospheric Physics, PhD • 4th Winter-Over',
                currentLocation: 'Bharati Station',
                assignedStationId: bharati.id,
                emergencyAvailability: 'Available',
                status: 'At Station',
            },
            {
                memberId: 'PER-024',
                name: 'Rahul Sharma',
                role: 'Doctor',
                qualification: 'Emergency Trauma Surgery, MD • High Altitude Medicine',
                currentLocation: 'Bharati Station',
                assignedStationId: bharati.id,
                emergencyAvailability: 'Available',
                status: 'At Station',
            },
            {
                memberId: 'PER-012',
                name: 'Dr. Anita Singh',
                role: 'Doctor',
                qualification: 'Intensive Care Specialist • Bharati Base Medical Lead',
                currentLocation: 'Bharati Station',
                assignedStationId: bharati.id,
                emergencyAvailability: 'Active',
                status: 'At Station',
            },
            {
                memberId: 'PER-035',
                name: 'Dr. Suresh Sen',
                role: 'Doctor',
                qualification: 'General Surgery & Triage • Maitri Hospital Chief',
                currentLocation: 'Maitri Station',
                assignedStationId: maitri.id,
                emergencyAvailability: 'Available',
                status: 'At Station',
            },
            {
                memberId: 'PER-008',
                name: 'Vikram Sethi',
                role: 'Logistics',
                qualification: 'Polar Fleet & Maritime Logistics Director',
                currentLocation: 'Cape Town Transit Hub',
                assignedStationId: bharati.id,
                emergencyAvailability: 'Available',
                status: 'In Transit',
            },
            {
                memberId: 'PER-019',
                name: 'Sunita Rao',
                role: 'Engineer',
                qualification: 'Power Systems & HVAC Arctic Specialist',
                currentLocation: 'Bharati Station',
                assignedStationId: bharati.id,
                emergencyAvailability: 'Available',
                status: 'At Station',
            },
            {
                memberId: 'PER-031',
                name: 'Arjun Das',
                role: 'Scientist',
                qualification: 'Glaciology & Ice Core Stratigraphy, PhD',
                currentLocation: 'Field Camp Fox-3',
                assignedStationId: maitri.id,
                emergencyAvailability: 'Standby',
                status: 'Field Mission',
            },
            {
                memberId: 'PER-044',
                name: 'Karan Mehra',
                role: 'Technician',
                qualification: 'PistenBully Heavy Vehicle Diagnostic Lead',
                currentLocation: 'Bharati Station',
                assignedStationId: bharati.id,
                emergencyAvailability: 'Available',
                status: 'At Station',
            },
        ];
        for (const p of personnelData) {
            await prisma.personnel.create({
                data: {
                    expeditionId,
                    ...p,
                    contactInfo: 'VHF Ch-16 / Iridium 8816-POLAR',
                    movementSchedule: 'Nominal Operations Protocol',
                },
            });
        }
        console.log('[SEED] Seeded 8 core personnel members.');
    }
    // 5. Seed Cargo
    const cargoCount = await prisma.cargo.count({ where: { expeditionId } });
    let med024 = null;
    if (cargoCount === 0) {
        med024 = await prisma.cargo.create({
            data: {
                expeditionId,
                cargoCode: 'MED-024',
                description: 'Critical Winter-Over Trauma & Antibiotic Replenishment',
                category: 'Medical',
                weightKg: 450,
                quantity: 150,
                origin: 'Goa Logistics Depot',
                destination: 'Bharati Station',
                currentLocation: 'MV Polar Queen (Cape Town Basin)',
                transportMode: 'Vessel',
                priority: 'CRITICAL',
                departureDate: new Date('2026-12-15'),
                eta: new Date('2027-01-14T18:00:00Z'),
                originalEta: new Date('2027-01-14T18:00:00Z'),
                delayHours: 0,
                status: 'In Transit',
                vesselName: 'MV Polar Queen (IMO 9128342)',
                riskScore: 28,
                riskLevel: 'LOW',
                specialRequirements: 'Temperature-controlled cold chain (+2°C to +8°C)',
                journeyJson: JSON.stringify([
                    { stage: 'Goa Logistics Staging', location: 'Goa Port', date: '15 Dec 2026', status: 'completed' },
                    { stage: 'Cape Town Transit Berth', location: 'Cape Town', date: '28 Dec 2026', status: 'completed' },
                    { stage: 'Southern Ocean Passage', location: 'At Sea (Roaring 40s)', date: '04 Jan 2027', status: 'current' },
                    { stage: 'Fast Ice Coastal Offload', location: 'Prydz Bay, Antarctica', date: '14 Jan 2027', status: 'upcoming' },
                    { stage: 'Station Final Storage', location: 'Bharati Medical Bay', date: '15 Jan 2027', status: 'upcoming' },
                ]),
            },
        });
        const otherCargo = [
            {
                cargoCode: 'FUEL-102',
                description: 'Bulk Arctic Grade Diesel Fuel (20,000L)',
                category: 'Fuel',
                weightKg: 18000,
                quantity: 20000,
                origin: 'Cape Town Port',
                destination: 'Maitri Station',
                currentLocation: 'At Sea (Approaching Schirmacher Oasis Shelf)',
                transportMode: 'Vessel',
                priority: 'HIGH',
                departureDate: new Date('2026-12-20'),
                eta: new Date('2027-01-18'),
                status: 'In Transit',
            },
            {
                cargoCode: 'SCI-088',
                description: 'Ultra-Deep Ice Core Sub-Surface Radar Arrays',
                category: 'Scientific',
                weightKg: 1200,
                quantity: 4,
                origin: 'Mumbai Scientific Facility',
                destination: 'Bharati Station',
                currentLocation: 'Cape Town Staging Depot',
                transportMode: 'Air',
                priority: 'MEDIUM',
                departureDate: new Date('2027-01-02'),
                eta: new Date('2027-01-22'),
                status: 'At Warehouse',
            },
            {
                cargoCode: 'FOOD-401',
                description: 'Cryo-Freeze Dried Winter Sustenance Packs',
                category: 'Food',
                weightKg: 3400,
                quantity: 500,
                origin: 'Goa Logistics Hub',
                destination: 'Bharati Station',
                currentLocation: 'MV Polar Queen',
                transportMode: 'Vessel',
                priority: 'MEDIUM',
                departureDate: new Date('2026-12-15'),
                eta: new Date('2027-01-14'),
                status: 'In Transit',
            },
            {
                cargoCode: 'SP-032',
                description: 'PistenBully Heavy Track Assemblies & Drive Motors',
                category: 'Spare Parts',
                weightKg: 2100,
                quantity: 2,
                origin: 'Kempten Depot, Germany',
                destination: 'Bharati Station',
                currentLocation: 'Cape Town Air Cargo Berth',
                transportMode: 'Air',
                priority: 'HIGH',
                departureDate: new Date('2027-01-05'),
                eta: new Date('2027-01-25'),
                status: 'Scheduled',
            },
        ];
        for (const c of otherCargo) {
            await prisma.cargo.create({
                data: {
                    expeditionId,
                    ...c,
                    originalEta: c.eta,
                    riskScore: 20,
                    riskLevel: 'LOW',
                },
            });
        }
        console.log('[SEED] Seeded 5 cargo shipments including MED-024.');
    }
    // 6. Seed Inventory Items
    const inventoryCount = await prisma.inventoryItem.count({ where: { expeditionId } });
    if (inventoryCount === 0) {
        const medCargo = await prisma.cargo.findFirst({ where: { expeditionId, cargoCode: 'MED-024' } });
        await prisma.inventoryItem.createMany({
            data: [
                {
                    expeditionId,
                    stationId: bharati.id,
                    category: 'Medicine',
                    itemName: 'Trauma & Critical Antibiotic Reserves',
                    currentStock: 220,
                    unit: 'units',
                    dailyUsage: 20, // 220 / 20 = 11 days baseline
                    safetyThresholdDays: 10,
                    linkedCargoId: medCargo?.id || null,
                    riskStatus: 'Normal',
                },
                {
                    expeditionId,
                    stationId: maitri.id,
                    category: 'Medicine',
                    itemName: 'Maitri Medical Reserve Surplus',
                    currentStock: 500, // 500 / 10 = 50 days (surplus donor station!)
                    unit: 'units',
                    dailyUsage: 10,
                    safetyThresholdDays: 12,
                    riskStatus: 'Normal',
                },
                {
                    expeditionId,
                    stationId: bharati.id,
                    category: 'Fuel',
                    itemName: 'Arctic Low-Pour Diesel',
                    currentStock: 48000,
                    unit: 'Liters',
                    dailyUsage: 2100, // 22.8 days
                    safetyThresholdDays: 15,
                    riskStatus: 'Normal',
                },
                {
                    expeditionId,
                    stationId: maitri.id,
                    category: 'Fuel',
                    itemName: 'Arctic Low-Pour Diesel',
                    currentStock: 38000,
                    unit: 'Liters',
                    dailyUsage: 1500, // 25 days
                    safetyThresholdDays: 14,
                    riskStatus: 'Normal',
                },
                {
                    expeditionId,
                    stationId: bharati.id,
                    category: 'Food',
                    itemName: 'Balanced Nutrient Rations',
                    currentStock: 3600,
                    unit: 'kg',
                    dailyUsage: 80, // 45 days
                    safetyThresholdDays: 20,
                    riskStatus: 'Normal',
                },
                {
                    expeditionId,
                    stationId: bharati.id,
                    category: 'Spare Parts',
                    itemName: 'Generator Primary Filters & Valves',
                    currentStock: 45,
                    unit: 'units',
                    dailyUsage: 1.2,
                    safetyThresholdDays: 15,
                    riskStatus: 'Normal',
                },
            ],
        });
        console.log('[SEED] Seeded 6 inventory lines with realistic burn rates.');
    }
    // 7. Seed Assets
    const assetCount = await prisma.asset.count({ where: { expeditionId } });
    if (assetCount === 0) {
        await prisma.asset.createMany({
            data: [
                {
                    expeditionId,
                    assetCode: 'PB-07',
                    name: 'PistenBully 300 Polar (Rescue Spec)',
                    type: 'Snow Vehicle',
                    stationId: bharati.id,
                    currentCondition: 'Good',
                    operatingHours: 1820,
                    maintenanceInterval: 2000, // 180h remaining
                    healthPercentage: 88,
                    failureRisk: 'Low',
                    status: 'Operational',
                    diagnosticNotes: 'Heated medical cabin installed. All hydraulic lines nominal.',
                },
                {
                    expeditionId,
                    assetCode: 'PB-04',
                    name: 'PistenBully Snowcat Utility-4',
                    type: 'Snow Vehicle',
                    stationId: maitri.id,
                    currentCondition: 'Good',
                    operatingHours: 1450,
                    maintenanceInterval: 2000,
                    healthPercentage: 92,
                    failureRisk: 'Low',
                    status: 'Operational',
                    diagnosticNotes: 'Overland traverse blade fitted.',
                },
                {
                    expeditionId,
                    assetCode: 'GEN-01',
                    name: 'Caterpillar 250kVA Polar Generator #1',
                    type: 'Generator',
                    stationId: bharati.id,
                    currentCondition: 'Good',
                    operatingHours: 3200,
                    maintenanceInterval: 5000,
                    healthPercentage: 95,
                    failureRisk: 'Low',
                    status: 'Operational',
                    diagnosticNotes: 'Prime base power unit.',
                },
                {
                    expeditionId,
                    assetCode: 'GEN-02',
                    name: 'Caterpillar 250kVA Polar Generator #2 (Standby)',
                    type: 'Generator',
                    stationId: bharati.id,
                    currentCondition: 'Good',
                    operatingHours: 1100,
                    maintenanceInterval: 5000,
                    healthPercentage: 98,
                    failureRisk: 'Low',
                    status: 'Standby',
                    diagnosticNotes: 'Warm standby mode active.',
                },
                {
                    expeditionId,
                    assetCode: 'CR-02',
                    name: 'Tadano 25T Cold Weather Crane',
                    type: 'Crane',
                    stationId: bharati.id,
                    currentCondition: 'Fair',
                    operatingHours: 1950,
                    maintenanceInterval: 2000, // 50h remaining
                    healthPercentage: 74,
                    failureRisk: 'Medium',
                    status: 'Operational',
                    diagnosticNotes: 'Hydraulic seal inspection due soon.',
                },
            ],
        });
        console.log('[SEED] Seeded 5 station assets.');
    }
    // 8. Seed Movements
    const movementCount = await prisma.movement.count({ where: { expeditionId } });
    if (movementCount === 0) {
        const mvPolarQueen = await prisma.cargo.findFirst({ where: { expeditionId, cargoCode: 'MED-024' } });
        const vikram = await prisma.personnel.findFirst({ where: { expeditionId, memberId: 'PER-008' } });
        const m1 = await prisma.movement.create({
            data: {
                expeditionId,
                fromLocation: 'Goa Logistics Depot',
                toLocation: 'Cape Town Transit Hub',
                departureTime: new Date('2026-12-15'),
                eta: new Date('2026-12-28'),
                actualArrival: new Date('2026-12-28'),
                transportMode: 'Vessel',
                status: 'Arrived',
                notes: 'Indian Ocean maritime transit completed without weather incident.',
            },
        });
        const m2 = await prisma.movement.create({
            data: {
                expeditionId,
                fromLocation: 'Cape Town Berth 4',
                toLocation: 'Bharati Station Ice Shelf',
                departureTime: new Date('2027-01-01'),
                eta: new Date('2027-01-14'),
                transportMode: 'Vessel',
                status: 'In Transit',
                currentLat: -52.4,
                currentLng: 48.6,
                notes: 'MV Polar Queen navigating Southern Ocean pack ice.',
            },
        });
        if (mvPolarQueen) {
            await prisma.movementCargo.create({
                data: { movementId: m2.id, cargoId: mvPolarQueen.id },
            });
        }
        if (vikram) {
            await prisma.movementPersonnel.create({
                data: { movementId: m2.id, personnelId: vikram.id },
            });
        }
        console.log('[SEED] Seeded first-class transit movements.');
    }
    // 9. Recalculate baseline Risk & Alerts
    await RiskService.calculateAndRecordExpeditionRisk(expeditionId);
    await AlertService.evaluateAndSyncAlerts(expeditionId);
    console.log('[SEED] Demo expedition INPEX-2027 initialized successfully with baseline risk: 38.');
}
if (process.argv[1]?.includes('demo-data')) {
    seedDemoData()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('[SEED ERROR]', err);
        process.exit(1);
    });
}

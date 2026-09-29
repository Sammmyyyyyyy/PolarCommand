import { prisma } from '../config/database.js';
import { AuthService } from '../services/auth.service.js';
import { RiskService } from '../services/risk.service.js';
import { AlertService } from '../services/alert.service.js';
import { OrganizationService } from '../services/organization.service.js';
export async function seedDemoData() {
    console.log('[SEED] Starting clean demo data initialization for POLAR COMMAND...');
    // 1. Seed Organization
    const defaultOrg = await OrganizationService.getOrCreateDefaultOrganization();
    // 2. Clean up existing operational data to enforce canonical state
    console.log('[SEED] Purging existing operational data...');
    await prisma.user.updateMany({
        data: { assignedExpeditionId: null, stationId: null, assignedPersonnelId: null },
    });
    await prisma.notification.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.restockRequest.deleteMany({});
    await prisma.trackingPing.deleteMany({});
    await prisma.actionItem.deleteMany({});
    await prisma.incident.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.cargo.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.asset.deleteMany({});
    await prisma.personnel.deleteMany({});
    await prisma.weatherSnapshot.deleteMany({});
    await prisma.station.deleteMany({});
    await prisma.expedition.deleteMany({});
    console.log('[SEED] Successfully purged old records.');
    // =========================================================================
    // 3. CREATE THE 3 CANONICAL STATIONS (NO DUPLICATES)
    // =========================================================================
    console.log('[SEED] Creating 3 canonical stations...');
    const bharati = await prisma.station.create({
        data: {
            organizationId: defaultOrg.id,
            name: 'Bharati Station',
            code: 'BHARATI',
            region: 'Larsemann Hills, Princess Elizabeth Land',
            location: 'Larsemann Hills, East Antarctica',
            latitude: -69.407,
            longitude: 76.191,
            capacity: 45,
            status: 'Operational',
            currentRisk: 28,
            connectivityStatus: 'ONLINE',
            expeditionIdsJson: '[]',
            personnelIdsJson: '[]',
        },
    });
    await prisma.weatherSnapshot.create({
        data: {
            stationId: bharati.id,
            temperature: -18.5,
            windSpeedKnots: 22,
            condition: 'Clear, Katabatic Winds',
            visibility: '15 km (Good)',
        },
    });
    const maitri = await prisma.station.create({
        data: {
            organizationId: defaultOrg.id,
            name: 'Maitri Station',
            code: 'MAITRI',
            region: 'Schirmacher Oasis, Queen Maud Land',
            location: 'Schirmacher Oasis, East Antarctica',
            latitude: -70.766,
            longitude: 11.732,
            capacity: 35,
            status: 'Operational',
            currentRisk: 34,
            connectivityStatus: 'ONLINE',
            expeditionIdsJson: '[]',
            personnelIdsJson: '[]',
        },
    });
    await prisma.weatherSnapshot.create({
        data: {
            stationId: maitri.id,
            temperature: -14.2,
            windSpeedKnots: 16,
            condition: 'Partly Cloudy',
            visibility: '12 km',
        },
    });
    const himadri = await prisma.station.create({
        data: {
            organizationId: defaultOrg.id,
            name: 'Himadri Polar Research Base',
            code: 'HIMADRI',
            region: 'Ny-Ålesund, Svalbard',
            location: 'Ny-Ålesund, Arctic Archipelago',
            latitude: 78.924,
            longitude: 11.928,
            capacity: 25,
            status: 'Operational',
            currentRisk: 14,
            connectivityStatus: 'ONLINE',
            expeditionIdsJson: '[]',
            personnelIdsJson: '[]',
        },
    });
    await prisma.weatherSnapshot.create({
        data: {
            stationId: himadri.id,
            temperature: -8.5,
            windSpeedKnots: 10,
            condition: 'Clear Arctic High',
            visibility: '25 km',
        },
    });
    // =========================================================================
    // 4. CREATE THE 3 CANONICAL EXPEDITIONS
    // =========================================================================
    console.log('[SEED] Creating 3 canonical expeditions...');
    // Expedition 1: "44th Indian Antarctic Expedition" (Bharati & Maitri)
    const exp1 = await prisma.expedition.create({
        data: {
            code: 'INPEX-2027',
            title: '44th Indian Antarctic Expedition',
            type: 'Scientific Research & Inter-Station Polar Logistics',
            missionObjective: 'Atmospheric physics, climate observation, ice sheet mass balance, and winter-over logistics sustainment across Bharati and Maitri.',
            organizationId: defaultOrg.id,
            status: 'ACTIVE',
            lifecycleStatus: 'ACTIVE',
            startDate: new Date('2026-11-01'),
            endDate: new Date('2027-11-30'),
            origin: 'Goa Logistics Depot / Cape Town Berth 4',
            destination: 'Bharati Station & Maitri Station, East Antarctica',
            intermediateHubs: 'Cape Town Transit Berth 4',
            transportModes: 'Vessel (MV Polar Queen), Ski-Plane (Twin Otter), PistenBully Snowcat',
            priority: 'CRITICAL',
            notes: 'National Antarctic mission operated under National Centre for Polar and Ocean Research (NCPOR).',
            overallRiskScore: 34,
            connectivityStatus: 'ONLINE',
            stationIdsJson: JSON.stringify([bharati.id, maitri.id]),
        },
    });
    // Expedition 2: "Queen Maud Land Traverse" (Maitri only)
    const exp2 = await prisma.expedition.create({
        data: {
            code: 'QML-TRAVERSE-2027',
            title: 'Queen Maud Land Traverse',
            type: 'Heavy Overland Traverse & High-Risk Fuel Resupply',
            missionObjective: '1,200 km deep-field overland convoy delivering arctic fuel bladders and sustaining sensory arrays across severe crevassed terrain under blizzard conditions.',
            organizationId: defaultOrg.id,
            commanderName: 'Capt. Vikram Sethi',
            status: 'ACTIVE',
            lifecycleStatus: 'ACTIVE',
            startDate: new Date('2026-12-01'),
            endDate: new Date('2027-04-30'),
            origin: 'Maitri Station Staging Berth',
            destination: 'Inland Polar Plateau Waypoint Tango-7',
            intermediateHubs: 'Field Camp Fox-3 Depot',
            transportModes: 'Heavy Convoy Snowcat, Tucker Sno-Cat, Sledge Cargo',
            priority: 'CRITICAL',
            notes: 'High-risk polar traverse navigating active shear zones and sustained 50+ knot katabatic blizzard fronts.',
            overallRiskScore: 68,
            connectivityStatus: 'WEAK',
            stationIdsJson: JSON.stringify([maitri.id]),
        },
    });
    // Expedition 3: "Amery Ice Shelf Deep Core Mission" (Bharati)
    const exp3 = await prisma.expedition.create({
        data: {
            code: 'AMERY-CORE-2027',
            title: 'Amery Ice Shelf Deep Core Mission',
            type: 'Glaciological Drilling & Ocean-Ice Interaction Survey',
            missionObjective: 'Extracting 800-meter paleoclimate ice cores and deploying autonomous acoustic sensor moorings under the Amery Ice Shelf.',
            organizationId: defaultOrg.id,
            commanderName: 'Dr. Anita Singh',
            status: 'ACTIVE',
            lifecycleStatus: 'ACTIVE',
            startDate: new Date('2026-10-15'),
            endDate: new Date('2027-06-30'),
            origin: 'Bharati Coastal Support Base',
            destination: 'Amery Ice Shelf Deep Borehole Camp-1',
            intermediateHubs: 'Lambert Glacier Gateway Station',
            transportModes: 'Ski-Plane (Twin Otter), Snowcat Traverse, Autonomous Submersibles',
            priority: 'HIGH',
            notes: 'Joint international glaciological project studying historical climate markers and ice-ocean boundary heat exchange.',
            overallRiskScore: 22,
            connectivityStatus: 'ONLINE',
            stationIdsJson: JSON.stringify([bharati.id]),
        },
    });
    // Update stations with linked expedition IDs
    await prisma.station.update({
        where: { id: bharati.id },
        data: {
            expeditionId: exp1.id,
            expeditionIdsJson: JSON.stringify([exp1.id, exp3.id]),
        },
    });
    await prisma.station.update({
        where: { id: maitri.id },
        data: {
            expeditionId: exp1.id,
            expeditionIdsJson: JSON.stringify([exp1.id, exp2.id]),
        },
    });
    await prisma.station.update({
        where: { id: himadri.id },
        data: {
            expeditionId: null,
            expeditionIdsJson: '[]',
        },
    });
    // =========================================================================
    // 5. SEED USERS & BIND PROPER ROLES AND ASSIGNMENTS
    // =========================================================================
    console.log('[SEED] Seeding users with proper roles and assignments...');
    await AuthService.seedDefaultUsers();
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const rajeshUser = await prisma.user.findUnique({ where: { email: 'bharati.manager@polarcommand.org' } });
    const sureshUser = await prisma.user.findUnique({ where: { email: 'maitri.manager@polarcommand.org' } });
    const anitaUser = await prisma.user.findUnique({ where: { email: 'leader@polarcommand.org' } });
    const rahulUser = await prisma.user.findUnique({ where: { email: 'member@polarcommand.org' } });
    const logisticsUser = await prisma.user.findUnique({ where: { email: 'logistics@polarcommand.org' } });
    // Update Station Managers on Station models
    if (rajeshUser) {
        await prisma.station.update({
            where: { id: bharati.id },
            data: { managerId: rajeshUser.id },
        });
        await prisma.user.update({
            where: { id: rajeshUser.id },
            data: {
                stationId: bharati.id,
                stationIdsJson: JSON.stringify([bharati.id]),
                assignedExpeditionId: exp1.id,
                expeditionIdsJson: JSON.stringify([exp1.id, exp3.id]),
            },
        });
    }
    if (sureshUser) {
        await prisma.station.update({
            where: { id: maitri.id },
            data: { managerId: sureshUser.id },
        });
        await prisma.user.update({
            where: { id: sureshUser.id },
            data: {
                stationId: maitri.id,
                stationIdsJson: JSON.stringify([maitri.id]),
                assignedExpeditionId: exp2.id,
                expeditionIdsJson: JSON.stringify([exp1.id, exp2.id]),
            },
        });
    }
    // Update Expedition Leaders on Expedition models
    if (anitaUser) {
        await prisma.expedition.update({
            where: { id: exp3.id },
            data: {
                leaderId: anitaUser.id,
                commanderId: anitaUser.id,
                commanderName: 'Dr. Anita Singh',
            },
        });
        await prisma.user.update({
            where: { id: anitaUser.id },
            data: {
                stationId: bharati.id,
                stationIdsJson: JSON.stringify([bharati.id]),
                assignedExpeditionId: exp3.id,
                expeditionIdsJson: JSON.stringify([exp3.id]),
            },
        });
    }
    // =========================================================================
    // 6. CREATE PERSONNEL (CLEANED OF VHF / IRIDIUM METADATA)
    // =========================================================================
    console.log('[SEED] Seeding personnel for stations and expeditions...');
    // --- Bharati Personnel ---
    const pRajesh = await prisma.personnel.create({
        data: {
            expeditionId: exp1.id,
            memberId: 'PER-001',
            name: 'Dr. Rajesh Nair',
            role: 'Station Manager',
            qualification: 'Atmospheric Physics, PhD • 4th Winter-Over',
            currentLocation: 'Bharati Station',
            assignedStationId: bharati.id,
            emergencyAvailability: 'Available',
            status: 'At Station',
            contactInfo: 'Base Internal Protocol',
            movementSchedule: 'Nominal Operations Protocol',
            latitude: -69.407,
            longitude: 76.191,
        },
    });
    const pAnita = await prisma.personnel.create({
        data: {
            expeditionId: exp3.id,
            memberId: 'PER-012',
            name: 'Dr. Anita Singh',
            role: 'Commander',
            qualification: 'Paleoclimatology & Deep Ice Coring Principal Investigator',
            currentLocation: 'Amery Borehole Camp',
            assignedStationId: bharati.id,
            emergencyAvailability: 'Available',
            status: 'Field Mission',
            contactInfo: 'Field Satellite Comms',
            latitude: -71.25,
            longitude: 70.82,
        },
    });
    const pRahul = await prisma.personnel.create({
        data: {
            expeditionId: exp3.id,
            memberId: 'PER-024',
            name: 'Rahul Sharma',
            role: 'Lead Field Scientist',
            qualification: 'Glaciology & Ice Core Analytics, PhD',
            currentLocation: 'Amery Borehole Camp',
            assignedStationId: bharati.id,
            emergencyAvailability: 'Available',
            status: 'Field Mission',
            contactInfo: 'Field Comms Unit',
            movementSchedule: 'Deep Field Sampling Protocol',
            latitude: -71.252,
            longitude: 70.825,
        },
    });
    const pSunita = await prisma.personnel.create({
        data: {
            expeditionId: exp1.id,
            memberId: 'PER-019',
            name: 'Sunita Rao',
            role: 'Power Systems Engineer',
            qualification: 'Power Systems & HVAC Arctic Specialist',
            currentLocation: 'Bharati Station',
            assignedStationId: bharati.id,
            emergencyAvailability: 'Available',
            status: 'At Station',
            contactInfo: 'Engineering Terminal',
            latitude: -69.407,
            longitude: 76.191,
        },
    });
    const pKaran = await prisma.personnel.create({
        data: {
            expeditionId: exp1.id,
            memberId: 'PER-044',
            name: 'Karan Mehra',
            role: 'Heavy Mechanical Lead',
            qualification: 'PistenBully Heavy Vehicle Diagnostic Lead',
            currentLocation: 'Bharati Station',
            assignedStationId: bharati.id,
            emergencyAvailability: 'Available',
            status: 'At Station',
            contactInfo: 'Mechanical Bay',
            latitude: -69.407,
            longitude: 76.191,
        },
    });
    const pDevendra = await prisma.personnel.create({
        data: {
            expeditionId: exp3.id,
            memberId: 'PER-061',
            name: 'Dr. Devendra Rathore',
            role: 'Scientist',
            qualification: 'Borehole Seismology & Glaciological Profiling, PhD',
            currentLocation: 'Amery Borehole Camp',
            assignedStationId: bharati.id,
            emergencyAvailability: 'Available',
            status: 'Field Mission',
            contactInfo: 'Field Comms Unit',
            latitude: -71.254,
            longitude: 70.835,
        },
    });
    const pMaya = await prisma.personnel.create({
        data: {
            expeditionId: exp3.id,
            memberId: 'PER-072',
            name: 'Maya Lindqvist',
            role: 'Scientist',
            qualification: 'Physical Oceanography & Under-Ice Moorings',
            currentLocation: 'Amery Shelf Sub-Surface Hole',
            assignedStationId: bharati.id,
            emergencyAvailability: 'Available',
            status: 'Field Mission',
            contactInfo: 'Oceanographic Rig',
            latitude: -71.28,
            longitude: 70.9,
        },
    });
    const pRajiv = await prisma.personnel.create({
        data: {
            expeditionId: exp3.id,
            memberId: 'PER-085',
            name: 'Rajiv Menon',
            role: 'Engineer',
            qualification: 'Autonomous Underwater Vehicle (AUV) Systems Lead',
            currentLocation: 'Amery Borehole Camp',
            assignedStationId: bharati.id,
            emergencyAvailability: 'Available',
            status: 'At Station',
            contactInfo: 'Robotics Control Bay',
            latitude: -71.25,
            longitude: 70.82,
        },
    });
    // --- Maitri Personnel ---
    const pSuresh = await prisma.personnel.create({
        data: {
            expeditionId: exp2.id,
            memberId: 'PER-035',
            name: 'Dr. Suresh Sen',
            role: 'Station Manager',
            qualification: 'General Surgery & Polar Medical Lead',
            currentLocation: 'Maitri Station',
            assignedStationId: maitri.id,
            emergencyAvailability: 'Available',
            status: 'At Station',
            contactInfo: 'Medical Hub',
            latitude: -70.766,
            longitude: 11.732,
        },
    });
    const pArjun = await prisma.personnel.create({
        data: {
            expeditionId: exp2.id,
            memberId: 'PER-052',
            name: 'Arjun Das',
            role: 'Traverse Navigation Lead',
            qualification: 'Polar Glacial Navigation & Radar Bathymetry Specialist',
            currentLocation: 'Field Camp Fox-3',
            assignedStationId: maitri.id,
            emergencyAvailability: 'Available',
            status: 'Field Mission',
            contactInfo: 'Convoy Lead Terminal',
            latitude: -71.42,
            longitude: 12.85,
        },
    });
    // Link users to their Personnel records
    if (rajeshUser) {
        await prisma.user.update({
            where: { id: rajeshUser.id },
            data: { assignedPersonnelId: pRajesh.id },
        });
    }
    if (sureshUser) {
        await prisma.user.update({
            where: { id: sureshUser.id },
            data: { assignedPersonnelId: pSuresh.id },
        });
    }
    if (anitaUser) {
        await prisma.user.update({
            where: { id: anitaUser.id },
            data: { assignedPersonnelId: pAnita.id },
        });
    }
    if (rahulUser && anitaUser) {
        await prisma.user.update({
            where: { id: rahulUser.id },
            data: {
                assignedPersonnelId: pRahul.id,
                teamLeaderId: anitaUser.id,
                stationId: bharati.id,
                stationIdsJson: JSON.stringify([bharati.id]),
                assignedExpeditionId: exp3.id,
                expeditionIdsJson: JSON.stringify([exp3.id]),
            },
        });
    }
    // Update station personnel arrays
    await prisma.station.update({
        where: { id: bharati.id },
        data: {
            personnelIdsJson: JSON.stringify([pRajesh.id, pAnita.id, pRahul.id, pSunita.id, pKaran.id, pDevendra.id, pMaya.id, pRajiv.id]),
        },
    });
    await prisma.station.update({
        where: { id: maitri.id },
        data: {
            personnelIdsJson: JSON.stringify([pSuresh.id, pArjun.id]),
        },
    });
    // Update expedition memberIdsJson
    await prisma.expedition.update({
        where: { id: exp1.id },
        data: {
            memberIdsJson: JSON.stringify([pRajesh.id, pSunita.id, pKaran.id]),
        },
    });
    await prisma.expedition.update({
        where: { id: exp2.id },
        data: {
            memberIdsJson: JSON.stringify([pSuresh.id, pArjun.id]),
        },
    });
    await prisma.expedition.update({
        where: { id: exp3.id },
        data: {
            memberIdsJson: JSON.stringify([pAnita.id, pRahul.id, pDevendra.id, pMaya.id, pRajiv.id]),
        },
    });
    // =========================================================================
    // 7. SEED CARGO & SHIPMENTS
    // =========================================================================
    console.log('[SEED] Seeding cargo & shipments...');
    const med024 = await prisma.cargo.create({
        data: {
            expeditionId: exp1.id,
            cargoCode: 'MED-024',
            description: 'Critical Winter-Over Trauma & Antibiotic Replenishment',
            category: 'Medical',
            weightKg: 450,
            quantity: 150,
            origin: 'Goa Logistics Depot',
            destination: 'Bharati Station',
            currentLocation: 'MV Polar Queen (Southern Ocean Passage)',
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
    await prisma.cargo.create({
        data: {
            expeditionId: exp1.id,
            cargoCode: 'FUEL-102',
            description: 'Bulk Arctic Grade Diesel Fuel (20,000L)',
            category: 'Fuel',
            weightKg: 18000,
            quantity: 20000,
            origin: 'Cape Town Port',
            destination: 'Maitri Station',
            currentLocation: 'MV Polar Queen',
            transportMode: 'Vessel',
            priority: 'HIGH',
            departureDate: new Date('2026-12-20'),
            eta: new Date('2027-01-18'),
            originalEta: new Date('2027-01-18'),
            status: 'In Transit',
            riskScore: 20,
            riskLevel: 'LOW',
        },
    });
    // =========================================================================
    // 8. SEED INVENTORY (BHARATI & MAITRI)
    // =========================================================================
    console.log('[SEED] Seeding inventory items...');
    // Bharati items
    await prisma.inventoryItem.createMany({
        data: [
            {
                expeditionId: exp1.id,
                stationId: bharati.id,
                category: 'Medicine',
                itemName: 'Medical Trauma Kits',
                currentStock: 25,
                unit: 'kits',
                dailyUsage: 5,
                safetyThresholdDays: 10,
                linkedCargoId: med024.id,
                riskStatus: 'Critical',
            },
            {
                expeditionId: exp1.id,
                stationId: bharati.id,
                category: 'Fuel',
                itemName: 'Arctic Low-Pour Diesel',
                currentStock: 48000,
                unit: 'Liters',
                dailyUsage: 2100,
                safetyThresholdDays: 15,
                riskStatus: 'Normal',
            },
            {
                expeditionId: exp1.id,
                stationId: bharati.id,
                category: 'Food',
                itemName: 'Balanced Nutrient Rations',
                currentStock: 3600,
                unit: 'kg',
                dailyUsage: 80,
                safetyThresholdDays: 20,
                riskStatus: 'Normal',
            },
            {
                expeditionId: exp1.id,
                stationId: bharati.id,
                category: 'Spare Parts',
                itemName: 'Generator Primary Filters & Valves',
                currentStock: 45,
                unit: 'units',
                dailyUsage: 1.2,
                safetyThresholdDays: 15,
                riskStatus: 'Normal',
            },
            {
                expeditionId: exp3.id,
                stationId: bharati.id,
                category: 'Scientific',
                itemName: 'Cryogenic Liquid Nitrogen Sample Cylinders',
                currentStock: 38,
                unit: 'cylinders',
                dailyUsage: 0.8,
                safetyThresholdDays: 15,
                riskStatus: 'Normal',
            },
            {
                expeditionId: exp3.id,
                stationId: bharati.id,
                category: 'Spare Parts',
                itemName: 'Diamond Drill Bit Head Assemblies',
                currentStock: 14,
                unit: 'units',
                dailyUsage: 0.2,
                safetyThresholdDays: 10,
                riskStatus: 'Normal',
            },
            {
                expeditionId: exp3.id,
                stationId: bharati.id,
                category: 'Power',
                itemName: 'Sub-Ice CTD Profiler Lithium Battery Modules',
                currentStock: 60,
                unit: 'packs',
                dailyUsage: 2,
                safetyThresholdDays: 14,
                riskStatus: 'Normal',
            },
            // Maitri items
            {
                expeditionId: exp1.id,
                stationId: maitri.id,
                category: 'Medicine',
                itemName: 'Maitri Medical Reserve Surplus',
                currentStock: 500,
                unit: 'units',
                dailyUsage: 10,
                safetyThresholdDays: 12,
                riskStatus: 'Normal',
            },
            {
                expeditionId: exp1.id,
                stationId: maitri.id,
                category: 'Fuel',
                itemName: 'Arctic Low-Pour Diesel',
                currentStock: 38000,
                unit: 'Liters',
                dailyUsage: 1500,
                safetyThresholdDays: 14,
                riskStatus: 'Normal',
            },
        ],
    });
    // =========================================================================
    // 9. SEED ASSETS / EQUIPMENT (BHARATI & MAITRI)
    // =========================================================================
    console.log('[SEED] Seeding assets/equipment...');
    // Bharati assets
    await prisma.asset.create({
        data: {
            expeditionId: exp1.id,
            stationId: bharati.id,
            assetCode: 'PB-07',
            name: 'PistenBully 400 Polar Traverse Snowcat',
            type: 'Heavy Snowcat Vehicle',
            operatingHours: 840,
            maintenanceInterval: 1000,
            status: 'Operational',
            healthPercentage: 92,
            failureRisk: 'Low',
            currentCondition: 'Good',
        },
    });
    await prisma.asset.create({
        data: {
            expeditionId: exp1.id,
            stationId: bharati.id,
            assetCode: 'TWIN-01',
            name: 'DHC-6 Twin Otter Ski Transport Plane',
            type: 'Ski Aircraft',
            operatingHours: 420,
            maintenanceInterval: 600,
            status: 'Operational',
            healthPercentage: 96,
            failureRisk: 'Low',
            currentCondition: 'Good',
        },
    });
    await prisma.asset.create({
        data: {
            expeditionId: exp3.id,
            stationId: bharati.id,
            assetCode: 'RIG-AMERY-01',
            name: 'Automated Hot-Water Deep Drill Rig',
            type: 'Scientific Drilling Rig',
            operatingHours: 320,
            maintenanceInterval: 1200,
            status: 'Operational',
            healthPercentage: 98,
            failureRisk: 'Low',
            currentCondition: 'Good',
        },
    });
    await prisma.asset.create({
        data: {
            expeditionId: exp3.id,
            stationId: bharati.id,
            assetCode: 'AUV-VARUNA',
            name: 'Autonomous Underwater Vehicle (AUV Varuna)',
            type: 'Sub-Ice Robotic Submersible',
            operatingHours: 110,
            maintenanceInterval: 500,
            status: 'Operational',
            healthPercentage: 94,
            failureRisk: 'Low',
            currentCondition: 'Good',
        },
    });
    await prisma.asset.create({
        data: {
            expeditionId: exp1.id,
            stationId: bharati.id,
            assetCode: 'GEN-BHARATI-01',
            name: 'Caterpillar 3512 Primary Generator Annex',
            type: 'Power Generator',
            operatingHours: 2450,
            maintenanceInterval: 3000,
            status: 'Operational',
            healthPercentage: 88,
            failureRisk: 'Low',
            currentCondition: 'Good',
        },
    });
    // Maitri assets
    await prisma.asset.create({
        data: {
            expeditionId: exp2.id,
            stationId: maitri.id,
            assetCode: 'PB-12',
            name: 'PistenBully 600 Heavy Polar Traverse Convoy Cat',
            type: 'Heavy Snowcat Vehicle',
            operatingHours: 1420,
            maintenanceInterval: 1500,
            status: 'Operational',
            healthPercentage: 74,
            failureRisk: 'Medium',
            currentCondition: 'Fair',
        },
    });
    await prisma.asset.create({
        data: {
            expeditionId: exp2.id,
            stationId: maitri.id,
            assetCode: 'SNO-04',
            name: 'Tucker Sno-Cat Heavy Sledge Towing Tractor',
            type: 'Traverse Tractor',
            operatingHours: 980,
            maintenanceInterval: 1000,
            status: 'Operational',
            healthPercentage: 81,
            failureRisk: 'Medium',
            currentCondition: 'Good',
        },
    });
    // =========================================================================
    // 10. SEED GPS TRACKING PINGS FOR EXP 3 (REAL MAP DATA)
    // =========================================================================
    console.log('[SEED] Seeding live tracking pings...');
    const now = new Date();
    await prisma.trackingPing.createMany({
        data: [
            {
                expeditionId: exp3.id,
                personnelId: pAnita.id,
                latitude: -71.2505,
                longitude: 70.8202,
                battery: 94,
                connectionStatus: 'LIVE',
                isSos: false,
                timestamp: new Date(now.getTime() - 10 * 60 * 1000),
            },
            {
                expeditionId: exp3.id,
                personnelId: pRahul.id,
                latitude: -71.252,
                longitude: 70.825,
                battery: 89,
                connectionStatus: 'LIVE',
                isSos: false,
                timestamp: new Date(now.getTime() - 5 * 60 * 1000),
            },
            {
                expeditionId: exp3.id,
                personnelId: pDevendra.id,
                latitude: -71.254,
                longitude: 70.835,
                battery: 88,
                connectionStatus: 'LIVE',
                isSos: false,
                timestamp: new Date(now.getTime() - 8 * 60 * 1000),
            },
            {
                expeditionId: exp3.id,
                personnelId: pMaya.id,
                latitude: -71.28,
                longitude: 70.9,
                battery: 92,
                connectionStatus: 'LIVE',
                isSos: false,
                timestamp: now,
            },
        ],
    });
    // =========================================================================
    // 11. SEED INITIAL RESTOCK REQUESTS (SUPPLY & LOGISTICS)
    // =========================================================================
    console.log('[SEED] Seeding restock requests...');
    if (rajeshUser) {
        await prisma.restockRequest.create({
            data: {
                stationId: bharati.id,
                expeditionId: exp1.id,
                requestedById: rajeshUser.id,
                requestedByName: rajeshUser.name,
                requestedByRole: rajeshUser.role,
                itemName: 'Arctic Emergency High-Calorie Rations',
                category: 'Food',
                requestedQuantity: 200,
                unit: 'packs',
                priority: 'HIGH',
                status: 'PENDING',
                notes: 'Winter-over safety reserves buffer replenishment.',
            },
        });
    }
    // =========================================================================
    // 12. RUN RISK & ALERTS SYNC FOR ALL EXPEDITIONS
    // =========================================================================
    console.log('[SEED] Computing initial risk and evaluating alerts...');
    await RiskService.calculateAndRecordExpeditionRisk(exp1.id);
    await RiskService.calculateAndRecordExpeditionRisk(exp2.id);
    await RiskService.calculateAndRecordExpeditionRisk(exp3.id);
    await AlertService.evaluateAndSyncAlerts(exp1.id);
    await AlertService.evaluateAndSyncAlerts(exp2.id);
    await AlertService.evaluateAndSyncAlerts(exp3.id);
    console.log('[SEED] Completed clean seed successfully!');
}
if (process.argv[1]?.includes('demo-data')) {
    seedDemoData()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error('[SEED ERROR]', err);
        process.exit(1);
    });
}

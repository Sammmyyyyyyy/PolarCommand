import {
  Expedition,
  ExpeditionRouteStep,
  ExpeditionTrackingInfo,
  CargoShipment,
  Personnel,
  Asset,
  Station,
  Alert,
} from '../types';
import {
  fetchExpeditions,
  fetchExpedition,
  fetchDashboard,
  fetchCargo,
  fetchPersonnel,
  fetchAssets,
  fetchAlerts,
  fetchStations,
} from './api';

// ---------------------------------------------------------------------------
// Deterministic Route & Tracking Specifications for Known Polar Missions
// (Architecture allows simple replacement with a real GPS / satellite API)
// ---------------------------------------------------------------------------

export interface ExpeditionTrackedPerson {
  id: string;
  name: string;
  role: string;
  expeditionId: string;
  expeditionName: string;
  stationName: string;
  locationName: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  battery: number;
  status: 'Connected' | 'Delayed' | 'Offline' | 'Emergency';
  lastUpdateSeconds: number;
  lastUpdateText: string;
  isEmergency?: boolean;
  emergencyMessage?: string;
  assignedEquipment?: string[];
  contactFrequency?: string;
}

export interface ExpeditionShipmentTrack {
  id: string;
  name: string;
  vesselOrFlight: string;
  currentStage: string;
  latitude: number;
  longitude: number;
  destinationStation: string;
  eta: string;
  delayHours: number;
  status: string;
  positionMode: 'LIVE' | 'LAST_KNOWN';
  lastUpdateMinutes: number;
}

interface MissionTemplate {
  route: ExpeditionRouteStep[];
  tracking: ExpeditionTrackingInfo;
  personnel: ExpeditionTrackedPerson[];
  shipments: ExpeditionShipmentTrack[];
  defaultMetrics: {
    personnel: number;
    cargo: number;
    assets: number;
    stations: number;
  };
  operationalRegion: string;
  currentPhase: string;
  progressPercent: number;
}

const MISSION_TEMPLATES: Record<string, MissionTemplate> = {
  amery: {
    route: [
      {
        id: 'amery-step-1',
        name: 'Bharati Station',
        type: 'station',
        status: 'completed',
        latitude: -69.407,
        longitude: 76.191,
        etaOrDate: 'Oct 2026',
        description: 'Mission launch base, equipment assembly and glaciology team muster',
      },
      {
        id: 'amery-step-2',
        name: 'Coastal Transit',
        type: 'transit',
        status: 'current',
        latitude: -70.32,
        longitude: 73.5,
        etaOrDate: 'Dec 2026',
        description: 'Sledging over coastal fast ice & navigating sastrugi corridors',
      },
      {
        id: 'amery-step-3',
        name: 'Research Site',
        type: 'research',
        status: 'upcoming',
        latitude: -71.25,
        longitude: 70.82,
        etaOrDate: 'Jan 2027',
        description: 'Deep ice shelf borehole drilling site for 800m paleoclimate cores',
      },
      {
        id: 'amery-step-4',
        name: 'Return to Base',
        type: 'return',
        status: 'upcoming',
        latitude: -69.407,
        longitude: 76.191,
        etaOrDate: 'Jun 2027',
        description: 'Retrograde traverse and cryo-core transport back to Bharati Station',
      },
    ],
    tracking: {
      currentRouteStepId: 'amery-step-2',
      currentRouteStep: 'Coastal Transit',
      trackingStatus: 'active',
      currentLocation: {
        name: 'Coastal Transit (Mile 114 Waypoint)',
        latitude: -70.32,
        longitude: 73.5,
        elevationMeters: 480,
      },
      lastUpdated: '12 minutes ago',
      speedKnots: 8.5,
      headingDegrees: 215,
      temperatureCelsius: -16,
      weatherCondition: 'Clear, Sastrugi surface',
    },
    personnel: [
      {
        id: 'amery-p1',
        name: 'Dr. Anita Singh',
        role: 'Expedition Commander & Paleoclimatologist',
        expeditionId: '06100857-15ef-48c0-80b4-2de6b55077ca',
        expeditionName: 'Amery Ice Shelf Deep Core Mission',
        stationName: 'Bharati Station',
        locationName: 'Amery Borehole Camp-1',
        latitude: -71.25,
        longitude: 70.82,
        elevationMeters: 510,
        battery: 92,
        status: 'Connected',
        lastUpdateSeconds: 14,
        lastUpdateText: '14 sec ago',
        isEmergency: false,
        assignedEquipment: ['Deep Coring Cryo-Rig', 'Iridium Extreme Satcom'],
        contactFrequency: 'VHF Ch-16 / Iridium 8816-AMERY',
      },
      {
        id: 'amery-p2',
        name: 'Rahul Sharma',
        role: 'Lead Field Scientist & Glaciologist',
        expeditionId: '06100857-15ef-48c0-80b4-2de6b55077ca',
        expeditionName: 'Amery Ice Shelf Deep Core Mission',
        stationName: 'Bharati Station',
        locationName: 'Amery Shelf Transition Rim - Crevasse Field',
        latitude: -70.21,
        longitude: 74.85,
        elevationMeters: 440,
        battery: 18,
        status: 'Emergency',
        lastUpdateSeconds: 120,
        lastUpdateText: '2 min ago',
        isEmergency: true,
        emergencyMessage: 'SOS: Sastrugi bridge displacement during ice-core sampling',
        assignedEquipment: ['Crevasse Radar', 'Handheld GPS'],
        contactFrequency: 'Emergency VHF Ch-14',
      },
      {
        id: 'amery-p3',
        name: 'Vikram Joshi',
        role: 'Communications Specialist',
        expeditionId: '06100857-15ef-48c0-80b4-2de6b55077ca',
        expeditionName: 'Amery Ice Shelf Deep Core Mission',
        stationName: 'Bharati Station',
        locationName: 'Coastal Transit (Mile 114 Waypoint)',
        latitude: -69.85,
        longitude: 75.3,
        elevationMeters: 380,
        battery: 74,
        status: 'Connected',
        lastUpdateSeconds: 45,
        lastUpdateText: '45 sec ago',
        isEmergency: false,
        assignedEquipment: ['Repeater Antenna', 'Iridium Unit'],
        contactFrequency: 'VHF Ch-01',
      },
      {
        id: 'amery-p4',
        name: 'Sunita Rao',
        role: 'Deep Drilling Mechanical Engineer',
        expeditionId: '06100857-15ef-48c0-80b4-2de6b55077ca',
        expeditionName: 'Amery Ice Shelf Deep Core Mission',
        stationName: 'Bharati Station',
        locationName: 'Bharati Station Staging Berth',
        latitude: -69.407,
        longitude: 76.191,
        elevationMeters: 35,
        battery: 85,
        status: 'Connected',
        lastUpdateSeconds: 30,
        lastUpdateText: '30 sec ago',
        isEmergency: false,
        assignedEquipment: ['Diagnostic Computer', 'Torque Kit'],
        contactFrequency: 'VHF Ch-09',
      },
    ],
    shipments: [
      {
        id: 'amery-s1',
        name: 'Deep Core Drill Consignment & Cryo Cylinders',
        vesselOrFlight: 'MV Polar Queen',
        currentStage: 'Antarctic Sea-Ice Ingress',
        latitude: -58.2,
        longitude: 62.4,
        destinationStation: 'Bharati Station',
        eta: '14 Jan 2027',
        delayHours: 0,
        status: 'In Transit',
        positionMode: 'LIVE',
        lastUpdateMinutes: 5,
      },
    ],
    defaultMetrics: {
      personnel: 4,
      cargo: 3,
      assets: 2,
      stations: 2,
    },
    operationalRegion: 'Larsemann Hills / Amery Ice Shelf Sector',
    currentPhase: 'Phase II: Overland Glacial Transit',
    progressPercent: 42,
  },

  qml: {
    route: [
      {
        id: 'qml-step-1',
        name: 'Maitri Station',
        type: 'station',
        status: 'completed',
        latitude: -70.766,
        longitude: 11.732,
        etaOrDate: 'Dec 2026',
        description: 'Schirmacher Oasis logistics embarkation & tracked convoy prep',
      },
      {
        id: 'qml-step-2',
        name: 'Staging Berth',
        type: 'berth',
        status: 'completed',
        latitude: -71.05,
        longitude: 12.1,
        etaOrDate: 'Jan 2027',
        description: 'Fuel bladders pressure-tested & heavy sledge train coupled',
      },
      {
        id: 'qml-step-3',
        name: 'Traverse Route',
        type: 'transit',
        status: 'current',
        latitude: -72.15,
        longitude: 12.8,
        etaOrDate: 'Feb 2027',
        description: 'Mile 420 shear zone, currently holding through katabatic blizzard',
      },
      {
        id: 'qml-step-4',
        name: 'Survey Zone',
        type: 'research',
        status: 'upcoming',
        latitude: -73.4,
        longitude: 14.2,
        etaOrDate: 'Mar 2027',
        description: 'Inland Polar Plateau Tango-7 sensor array deployment',
      },
      {
        id: 'qml-step-5',
        name: 'Return to Base',
        type: 'return',
        status: 'upcoming',
        latitude: -70.766,
        longitude: 11.732,
        etaOrDate: 'Apr 2027',
        description: 'Full convoy extraction returning to Maitri Base shelter',
      },
    ],
    tracking: {
      currentRouteStepId: 'qml-step-3',
      currentRouteStep: 'Traverse Route',
      trackingStatus: 'caution',
      currentLocation: {
        name: 'Mile 420 Shear Zone (Queen Maud Land Plateau)',
        latitude: -72.15,
        longitude: 12.8,
        elevationMeters: 1850,
      },
      lastUpdated: '6 minutes ago',
      speedKnots: 0,
      headingDegrees: 180,
      temperatureCelsius: -28,
      weatherCondition: 'Blizzard, 52 knots katabatic gale (Holding position)',
    },
    personnel: [
      {
        id: 'qml-p1',
        name: 'Capt. Vikram Sethi',
        role: 'Polar Convoy Commander',
        expeditionId: 'ddbb532f-41ed-4fc6-b66a-4702f058eb24',
        expeditionName: 'Queen Maud Land Traverse',
        stationName: 'Maitri Station',
        locationName: 'Overland Convoy Mile 420 (Holding Camp)',
        latitude: -72.15,
        longitude: 12.8,
        elevationMeters: 1850,
        battery: 64,
        status: 'Connected',
        lastUpdateSeconds: 45,
        lastUpdateText: '45 sec ago',
        isEmergency: false,
        assignedEquipment: ['PistenBully 300 Convoy Lead', 'Iridium Unit'],
        contactFrequency: 'VHF Ch-16 / Sledge Transceiver',
      },
      {
        id: 'qml-p2',
        name: 'Arjun Das',
        role: 'Glaciology & Crevasse Detection Specialist',
        expeditionId: 'ddbb532f-41ed-4fc6-b66a-4702f058eb24',
        expeditionName: 'Queen Maud Land Traverse',
        stationName: 'Maitri Station',
        locationName: 'Mile 428 Crevasse Field Forward Scout',
        latitude: -72.19,
        longitude: 12.88,
        elevationMeters: 1890,
        battery: 42,
        status: 'Delayed',
        lastUpdateSeconds: 480,
        lastUpdateText: '8 min ago',
        isEmergency: false,
        assignedEquipment: ['Ground Penetrating Radar', 'Field Radio'],
        contactFrequency: 'VHF Ch-16 / Scout Radio',
      },
      {
        id: 'qml-p3',
        name: 'Tenzing Norbu',
        role: 'High-Latitude Route Scout & Mechanic',
        expeditionId: 'ddbb532f-41ed-4fc6-b66a-4702f058eb24',
        expeditionName: 'Queen Maud Land Traverse',
        stationName: 'Maitri Station',
        locationName: 'Convoy Mile 420 Camp',
        latitude: -72.14,
        longitude: 12.78,
        elevationMeters: 1845,
        battery: 78,
        status: 'Connected',
        lastUpdateSeconds: 60,
        lastUpdateText: '1 min ago',
        isEmergency: false,
        assignedEquipment: ['Tucker Sno-Cat Tanker', 'Track Tool Kit'],
        contactFrequency: 'VHF Ch-16',
      },
    ],
    shipments: [
      {
        id: 'qml-s1',
        name: 'Extreme-Cold Arctic Kerosene Bladders (15,000L)',
        vesselOrFlight: 'Heavy Convoy Sledge Train',
        currentStage: 'Mile 420 Shear Zone Bypass',
        latitude: -72.15,
        longitude: 12.8,
        destinationStation: 'Waypoint Tango-7',
        eta: '18 Jan 2027',
        delayHours: 96,
        status: 'Delayed in Field',
        positionMode: 'LIVE',
        lastUpdateMinutes: 12,
      },
    ],
    defaultMetrics: {
      personnel: 3,
      cargo: 2,
      assets: 2,
      stations: 1,
    },
    operationalRegion: 'Queen Maud Land Plateau & Schirmacher Oasis',
    currentPhase: 'Phase III: High Plateau Crevasse Navigation',
    progressPercent: 55,
  },

  inpex: {
    route: [
      {
        id: 'inpex-step-1',
        name: 'Goa Depot',
        type: 'depot',
        status: 'completed',
        latitude: 15.4,
        longitude: 73.8,
        etaOrDate: 'Nov 2026',
        description: 'National Centre for Polar and Ocean Research (NCPOR) staging',
      },
      {
        id: 'inpex-step-2',
        name: 'Cape Town',
        type: 'transit',
        status: 'completed',
        latitude: -33.92,
        longitude: 18.42,
        etaOrDate: 'Dec 2026',
        description: 'Berth 4 bunker fueling & international polar customs quarantine',
      },
      {
        id: 'inpex-step-3',
        name: 'Polar Vessel',
        type: 'transit',
        status: 'current',
        latitude: -52.45,
        longitude: 48.2,
        etaOrDate: 'Jan 2027',
        description: 'MV Polar Queen passage through Roaring Forties into pack ice',
      },
      {
        id: 'inpex-step-4',
        name: 'Bharati Station',
        type: 'station',
        status: 'upcoming',
        latitude: -69.407,
        longitude: 76.191,
        etaOrDate: 'Nov 2027',
        description: 'Fast ice discharge, winter-over changeover & year-long science',
      },
    ],
    tracking: {
      currentRouteStepId: 'inpex-step-3',
      currentRouteStep: 'Polar Vessel',
      trackingStatus: 'active',
      currentLocation: {
        name: 'MV Polar Queen (Southern Ocean Passage)',
        latitude: -52.45,
        longitude: 48.2,
        elevationMeters: 0,
      },
      lastUpdated: '18 minutes ago',
      speedKnots: 13.8,
      headingDegrees: 165,
      temperatureCelsius: -2,
      weatherCondition: 'Moderate swell, 24 knot westerly',
    },
    personnel: [
      {
        id: 'inpex-p1',
        name: 'Dr. Rajesh Nair',
        role: 'Expedition Commander & Atmospheric Physicist',
        expeditionId: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb',
        expeditionName: '44th Indian Antarctic Expedition',
        stationName: 'Bharati Station',
        locationName: 'Bharati Station Control Room',
        latitude: -69.407,
        longitude: 76.191,
        elevationMeters: 35,
        battery: 88,
        status: 'Connected',
        lastUpdateSeconds: 14,
        lastUpdateText: '14 sec ago',
        isEmergency: false,
        assignedEquipment: ['Iridium Pilot Gateway', 'Station VHF Ch-16'],
        contactFrequency: 'VHF Ch-16',
      },
      {
        id: 'inpex-p2',
        name: 'Dr. Suresh Sen',
        role: 'Maitri Medical Chief & Surgeon',
        expeditionId: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb',
        expeditionName: '44th Indian Antarctic Expedition',
        stationName: 'Maitri Station',
        locationName: 'Maitri Station Hospital Bay',
        latitude: -70.766,
        longitude: 11.732,
        elevationMeters: 130,
        battery: 80,
        status: 'Connected',
        lastUpdateSeconds: 60,
        lastUpdateText: '1 min ago',
        isEmergency: false,
        assignedEquipment: ['Emergency Clinic Triage Bay'],
        contactFrequency: 'VHF Ch-14',
      },
      {
        id: 'inpex-p3',
        name: 'Dr. Anita Singh',
        role: 'Senior Glaciologist & Science Officer',
        expeditionId: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb',
        expeditionName: '44th Indian Antarctic Expedition',
        stationName: 'Bharati Station',
        locationName: 'Bharati Station Analytical Lab',
        latitude: -69.407,
        longitude: 76.191,
        elevationMeters: 35,
        battery: 91,
        status: 'Connected',
        lastUpdateSeconds: 180,
        lastUpdateText: '3 min ago',
        isEmergency: false,
        assignedEquipment: ['Spectrometer', 'Firn Stratigraphy Probe'],
        contactFrequency: 'VHF Ch-12',
      },
      {
        id: 'inpex-p4',
        name: 'Karan Mehra',
        role: 'Vehicle Diagnostics & Mechanical Lead',
        expeditionId: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb',
        expeditionName: '44th Indian Antarctic Expedition',
        stationName: 'Bharati Station',
        locationName: 'Larsemann Hills Vehicle Workshop',
        latitude: -69.412,
        longitude: 76.185,
        elevationMeters: 40,
        battery: 72,
        status: 'Connected',
        lastUpdateSeconds: 50,
        lastUpdateText: '50 sec ago',
        isEmergency: false,
        assignedEquipment: ['Hydraulic Testing Rig'],
        contactFrequency: 'VHF Ch-08',
      },
      {
        id: 'inpex-p5',
        name: 'Sunita Rao',
        role: 'Power Infrastructure & HVAC Lead',
        expeditionId: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb',
        expeditionName: '44th Indian Antarctic Expedition',
        stationName: 'Bharati Station',
        locationName: 'Bharati Generator Complex',
        latitude: -69.405,
        longitude: 76.195,
        elevationMeters: 36,
        battery: 65,
        status: 'Connected',
        lastUpdateSeconds: 40,
        lastUpdateText: '40 sec ago',
        isEmergency: false,
        assignedEquipment: ['Power Grid Analyzer'],
        contactFrequency: 'VHF Ch-09',
      },
      {
        id: 'inpex-p6',
        name: 'Field Specialist Ravi',
        role: 'Cargo Logistics Specialist',
        expeditionId: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb',
        expeditionName: '44th Indian Antarctic Expedition',
        stationName: 'Bharati Station',
        locationName: 'Prydz Bay Sea Ice Berth',
        latitude: -69.38,
        longitude: 76.24,
        elevationMeters: 2,
        battery: 55,
        status: 'Delayed',
        lastUpdateSeconds: 360,
        lastUpdateText: '6 min ago',
        isEmergency: false,
        assignedEquipment: ['Forklift Crane Unit', 'Handheld Transceiver'],
        contactFrequency: 'VHF Ch-05',
      },
    ],
    shipments: [
      {
        id: 'inpex-s1',
        name: 'Winter-Over Trauma & Critical Antibiotics',
        vesselOrFlight: 'MV Polar Queen',
        currentStage: 'Southern Ocean Roaring Forties',
        latitude: -52.45,
        longitude: 48.2,
        destinationStation: 'Bharati Station',
        eta: '14 Jan 2027',
        delayHours: 0,
        status: 'In Transit',
        positionMode: 'LIVE',
        lastUpdateMinutes: 18,
      },
    ],
    defaultMetrics: {
      personnel: 6,
      cargo: 3,
      assets: 2,
      stations: 2,
    },
    operationalRegion: 'Southern Ocean Passage & Larsemann Hills',
    currentPhase: 'Phase I: Marine Transit & Sea-Ice Ingress',
    progressPercent: 35,
  },
};

/**
 * Match an expedition to its mission template or create a clean fallback
 */
function getTemplateForExpedition(exp: Expedition): MissionTemplate {
  const code = (exp.code || '').toLowerCase();
  const title = (exp.title || '').toLowerCase();

  if (code.includes('amery') || title.includes('amery')) {
    return MISSION_TEMPLATES.amery;
  }
  if (code.includes('qml') || title.includes('queen maud') || title.includes('traverse')) {
    return MISSION_TEMPLATES.qml;
  }
  if (code.includes('inpex') || title.includes('44th') || title.includes('indian')) {
    return MISSION_TEMPLATES.inpex;
  }

  // Dynamic clean fallback for custom created missions
  const originName = (exp.origin || 'Base Staging').split('/')[0].split(',')[0].trim();
  const destName = (exp.destination || 'Field Camp').split('&')[0].split(',')[0].trim();
  const midName = exp.intermediateHubs ? exp.intermediateHubs.split(',')[0].trim() : 'Transit Waypoint';

  return {
    route: [
      {
        id: `step-${exp.id}-1`,
        name: originName || 'Origin Depot',
        type: 'station',
        status: 'completed',
        latitude: -69.407,
        longitude: 76.191,
        etaOrDate: 'Start Phase',
        description: 'Mission launch & logistics departure',
      },
      {
        id: `step-${exp.id}-2`,
        name: midName,
        type: 'transit',
        status: 'current',
        latitude: -70.5,
        longitude: 72.0,
        etaOrDate: 'In Transit',
        description: 'En-route transit & support staging',
      },
      {
        id: `step-${exp.id}-3`,
        name: destName,
        type: 'research',
        status: 'upcoming',
        latitude: -71.5,
        longitude: 70.0,
        etaOrDate: 'Target Arrival',
        description: 'Target objective operational field site',
      },
      {
        id: `step-${exp.id}-4`,
        name: 'Return Base',
        type: 'return',
        status: 'upcoming',
        latitude: -69.407,
        longitude: 76.191,
        etaOrDate: 'Mission Conclusion',
        description: 'Retrograde recovery and expedition closeout',
      },
    ],
    tracking: {
      currentRouteStepId: `step-${exp.id}-2`,
      currentRouteStep: midName,
      trackingStatus: 'active',
      currentLocation: {
        name: `${midName} Corridor`,
        latitude: -70.5,
        longitude: 72.0,
        elevationMeters: 520,
      },
      lastUpdated: '15 minutes ago',
      speedKnots: 6.0,
      headingDegrees: 190,
      temperatureCelsius: -15,
      weatherCondition: 'Overcast, Calm',
    },
    personnel: (exp.personnel && exp.personnel.length > 0)
      ? exp.personnel.map((p, idx) => ({
          id: p.id || `p-${exp.id}-${idx}`,
          name: p.name || `Field Specialist ${idx + 1}`,
          role: p.role || 'Expedition Scientist',
          expeditionId: exp.id,
          expeditionName: exp.title,
          stationName: originName || 'Bharati Station',
          locationName: midName || 'Coastal Waypoint',
          latitude: -70.5 + idx * 0.05,
          longitude: 72.0 + idx * 0.05,
          elevationMeters: 450,
          battery: 85 - idx * 5,
          status: 'Connected' as const,
          lastUpdateSeconds: 30 + idx * 10,
          lastUpdateText: `${30 + idx * 10} sec ago`,
          isEmergency: false,
        }))
      : [
          {
            id: `p-${exp.id}-1`,
            name: exp.commanderName || 'Expedition Lead',
            role: 'Mission Commander',
            expeditionId: exp.id,
            expeditionName: exp.title,
            stationName: originName || 'Bharati Station',
            locationName: `${originName} Headquarters`,
            latitude: -69.407,
            longitude: 76.191,
            elevationMeters: 35,
            battery: 88,
            status: 'Connected' as const,
            lastUpdateSeconds: 20,
            lastUpdateText: '20 sec ago',
            isEmergency: false,
          },
          {
            id: `p-${exp.id}-2`,
            name: 'Senior Field Specialist',
            role: 'Glaciologist',
            expeditionId: exp.id,
            expeditionName: exp.title,
            stationName: originName || 'Bharati Station',
            locationName: `${midName} Corridor`,
            latitude: -70.5,
            longitude: 72.0,
            elevationMeters: 520,
            battery: 75,
            status: 'Connected' as const,
            lastUpdateSeconds: 60,
            lastUpdateText: '1 min ago',
            isEmergency: false,
          },
        ],
    shipments: (exp.cargo && exp.cargo.length > 0)
      ? exp.cargo.map((c, idx) => ({
          id: c.id || `s-${exp.id}-${idx}`,
          name: c.description || 'General Polar Cargo',
          vesselOrFlight: c.vesselName || 'MV Polar Queen',
          currentStage: c.currentLocation || 'In Transit',
          latitude: -55.0 + idx * 2,
          longitude: 50.0 + idx * 2,
          destinationStation: originName || 'Bharati Station',
          eta: c.eta || 'Upcoming',
          delayHours: c.delayHours || 0,
          status: c.status || 'In Transit',
          positionMode: 'LIVE' as const,
          lastUpdateMinutes: 10,
        }))
      : [
          {
            id: `s-${exp.id}-1`,
            name: `${exp.title} Operational Supply Consignment`,
            vesselOrFlight: 'MV Polar Queen',
            currentStage: 'Southern Ocean Transit',
            latitude: -54.2,
            longitude: 52.8,
            destinationStation: originName || 'Bharati Station',
            eta: 'Upcoming',
            delayHours: 0,
            status: 'In Transit',
            positionMode: 'LIVE' as const,
            lastUpdateMinutes: 15,
          },
        ],
    defaultMetrics: {
      personnel: exp._count?.personnel ?? 4,
      cargo: exp._count?.cargo ?? 2,
      assets: exp._count?.assets ?? 2,
      stations: exp.stations?.length ?? 1,
    },
    operationalRegion: 'Antarctic Continental Shelf',
    currentPhase: 'Operational Phase I',
    progressPercent: 40,
  };
}

/**
 * Enriches a raw Expedition object with structured route, tracking, and metric information.
 */
export function enrichExpedition(rawExp: Expedition): Expedition {
  const template = getTemplateForExpedition(rawExp);

  // Preserve existing backend counts if they are richer
  const personnelCount =
    rawExp.personnel?.length ||
    rawExp._count?.personnel ||
    rawExp.personnelCount ||
    template.defaultMetrics.personnel;

  const totalCargoCount =
    rawExp.cargo?.length ||
    rawExp._count?.cargo ||
    rawExp.totalCargoCount ||
    template.defaultMetrics.cargo;

  const assetsCount =
    rawExp.assets?.length ||
    rawExp._count?.assets ||
    template.defaultMetrics.assets;

  const stationsCount =
    rawExp.stations?.length ||
    template.defaultMetrics.stations;

  return {
    ...rawExp,
    route: template.route,
    tracking: template.tracking,
    currentRouteStep: template.tracking.currentRouteStep,
    trackingStatus: template.tracking.trackingStatus,
    currentLocation: template.tracking.currentLocation,
    lastUpdated: template.tracking.lastUpdated,
    personnelCount,
    totalCargoCount,
    _count: {
      personnel: personnelCount,
      cargo: totalCargoCount,
      inventory: rawExp._count?.inventory ?? 8,
      assets: assetsCount,
      stations: stationsCount,
      incidents: rawExp._count?.incidents ?? 0,
      alerts: rawExp._count?.alerts ?? 0,
      tasks: rawExp._count?.tasks ?? 2,
    } as any,
  };
}

/**
 * Service: Fetch all expeditions enriched with data-driven routes and tracking.
 */
export async function getExpeditionsWithRoutes(): Promise<Expedition[]> {
  const rawList = await fetchExpeditions();
  return rawList.map((exp) => enrichExpedition(exp));
}

/**
 * Service: Fetch full details for a single expedition, including related team, cargo, assets, and alerts.
 */
export async function getExpeditionDetails(idOrCode: string): Promise<Expedition> {
  const rawExp = await fetchExpedition(idOrCode);
  const expId = rawExp.id;

  // Concurrently fetch related resources for this specific expedition
  const [cargoList, personnelList, assetsList, alertsList, stationsList] = await Promise.all([
    fetchCargo(expId).catch(() => [] as CargoShipment[]),
    fetchPersonnel(expId).catch(() => [] as Personnel[]),
    fetchAssets(expId).catch(() => [] as Asset[]),
    fetchAlerts(expId).catch(() => [] as Alert[]),
    fetchStations(expId).catch(() => [] as Station[]),
  ]);

  const enriched = enrichExpedition(rawExp);

  return {
    ...enriched,
    cargo: cargoList.length > 0 ? cargoList : rawExp.cargo,
    cargoShipments: cargoList.length > 0 ? cargoList : rawExp.cargo,
    personnel: personnelList.length > 0 ? personnelList : rawExp.personnel,
    assets: assetsList.length > 0 ? assetsList : rawExp.assets,
    keyAssets: assetsList.length > 0 ? assetsList : rawExp.assets,
    alerts: alertsList.length > 0 ? alertsList : rawExp.alerts,
    stations: stationsList.length > 0 ? stationsList : rawExp.stations,
    assignedStations: stationsList.length > 0 ? stationsList : rawExp.stations,
  };
}

const CANONICAL_EXPEDITION_STATIONS: Record<string, Station[]> = {
  amery: [
    {
      id: 'st-bharati',
      expeditionId: '06100857-15ef-48c0-80b4-2de6b55077ca',
      name: 'Bharati Station',
      code: 'BHARATI',
      region: 'Larsemann Hills, Princess Elizabeth Land',
      latitude: -69.407,
      longitude: 76.191,
      capacity: 45,
      status: 'Operational',
      currentRisk: 10,
      weather: [{ temperature: -18.5, condition: 'Katabatic Winds', windSpeedKnots: 22 }],
    },
    {
      id: 'st-himadri',
      expeditionId: '06100857-15ef-48c0-80b4-2de6b55077ca',
      name: 'Himadri Polar Research Base',
      code: 'HIMADRI',
      region: 'Ny-Ålesund, Arctic Research Hub',
      latitude: 78.92,
      longitude: 11.92,
      capacity: 25,
      status: 'Operational',
      currentRisk: 8,
      weather: [{ temperature: -4.2, condition: 'Clear', windSpeedKnots: 10 }],
    },
  ],
  qml: [
    {
      id: 'st-maitri',
      expeditionId: 'ddbb532f-41ed-4fc6-b66a-4702f058eb24',
      name: 'Maitri Station',
      code: 'MAITRI',
      region: 'Schirmacher Oasis, Queen Maud Land',
      latitude: -70.766,
      longitude: 11.732,
      capacity: 35,
      status: 'Operational',
      currentRisk: 12,
      weather: [{ temperature: -14.2, condition: 'Partly Cloudy', windSpeedKnots: 16 }],
    },
  ],
  inpex: [
    {
      id: 'st-bharati',
      expeditionId: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb',
      name: 'Bharati Station',
      code: 'BHARATI',
      region: 'Larsemann Hills, Princess Elizabeth Land',
      latitude: -69.407,
      longitude: 76.191,
      capacity: 45,
      status: 'Operational',
      currentRisk: 10,
      weather: [{ temperature: -18.5, condition: 'Katabatic Winds', windSpeedKnots: 22 }],
    },
    {
      id: 'st-maitri',
      expeditionId: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb',
      name: 'Maitri Station',
      code: 'MAITRI',
      region: 'Schirmacher Oasis, Queen Maud Land',
      latitude: -70.766,
      longitude: 11.732,
      capacity: 35,
      status: 'Operational',
      currentRisk: 12,
      weather: [{ temperature: -14.2, condition: 'Partly Cloudy', windSpeedKnots: 16 }],
    },
  ],
};

/**
 * Get tracked field personnel strictly for the given expedition (deterministic GPS telemetry)
 */
export function getExpeditionTrackedPersonnel(exp: Expedition): ExpeditionTrackedPerson[] {
  const template = getTemplateForExpedition(exp);
  return template.personnel;
}

/**
 * Get active logistics shipments strictly for the given expedition
 */
export function getExpeditionShipments(exp: Expedition): ExpeditionShipmentTrack[] {
  const template = getTemplateForExpedition(exp);
  return template.shipments;
}

/**
 * Get operational stations strictly connected to the given expedition
 */
export function getExpeditionStations(exp: Expedition, allStations: Station[] = []): Station[] {
  const code = (exp.code || '').toLowerCase();
  const title = (exp.title || '').toLowerCase();

  let key = 'inpex';
  if (code.includes('amery') || title.includes('amery')) {
    key = 'amery';
  } else if (code.includes('qml') || title.includes('queen maud') || title.includes('traverse')) {
    key = 'qml';
  }

  const canonical = CANONICAL_EXPEDITION_STATIONS[key] || CANONICAL_EXPEDITION_STATIONS.inpex;

  if (allStations && allStations.length > 0) {
    // If backend stations are present, match them to this expedition's canonical stations
    const matched = allStations.filter((s) =>
      canonical.some(
        (c) =>
          s.name.toLowerCase().includes(c.code.toLowerCase()) ||
          s.code.toLowerCase().includes(c.code.toLowerCase()) ||
          s.id === c.id
      )
    );
    if (matched.length > 0) return matched;
  }

  return canonical;
}


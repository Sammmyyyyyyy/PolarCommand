import { Station, InventoryItem, Asset, Personnel } from '../types';
import { fetchStations, fetchStationDetail, createAlert } from './api';

export interface StationInventoryItem {
  id: string;
  name: string;
  category: 'Medicine' | 'Fuel' | 'Food' | 'Water' | 'Spare Parts' | 'Scientific' | 'Communication' | 'Safety';
  currentStock: number;
  unit: string;
  safetyMinimum: number;
  dailyConsumption: number;
  daysOfSupply: number;
  status: 'OPTIMAL' | 'HEALTHY' | 'LOW' | 'CRITICAL' | 'OUT OF STOCK';
  lastUpdated: string;
  upcomingDelivery?: {
    quantity: number;
    etaDays: number;
    status: 'IN TRANSIT' | 'SCHEDULED';
    vessel: string;
  } | null;
}

export interface StationDelivery {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  etaDays: number;
  status: 'IN TRANSIT' | 'SCHEDULED';
  vessel: string;
}

export interface StationFullRecord extends Station {
  stationManager: {
    name: string;
    role: string;
    contact: string;
    status: 'Connected' | 'Delayed' | 'Offline';
    email?: string;
  };
  activeExpeditions: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  inventoryCount: number;
  personnelCount: number;
  readinessScore: number;
  assignedPersonnelList: Array<{
    id: string;
    name: string;
    role: string;
    qualification?: string;
    status: string;
    contactInfo?: string;
  }>;
  categorizedInventory: Record<string, Array<{
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    status: 'Available' | 'Low' | 'Critical';
    lastUpdated: string;
  }>>;
  inventoryItems: StationInventoryItem[];
  deliveries: StationDelivery[];
}

// Canonical Station Metadata specifications
const CANONICAL_STATIONS: Record<string, {
  name: string;
  code: string;
  region: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: string;
  manager: { name: string; role: string; contact: string; status: 'Connected' | 'Delayed' | 'Offline' };
  activeExpeditions: Array<{ id: string; name: string; status: string }>;
  personnel: Array<{ id: string; name: string; role: string; qualification: string; status: string; contactInfo: string }>;
  inventoryItems: StationInventoryItem[];
  deliveries: StationDelivery[];
  readinessScore: number;
}> = {
  bharati: {
    name: 'Bharati Station',
    code: 'BHARATI',
    region: 'Larsemann Hills, Princess Elizabeth Land, East Antarctica',
    latitude: -69.407,
    longitude: 76.191,
    capacity: 45,
    status: 'Operational',
    manager: {
      name: 'Dr. Rajesh Nair',
      role: 'Station Manager',
      contact: '',
      status: 'Connected',
    },
    activeExpeditions: [
      { id: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb', name: '44th Indian Antarctic Expedition', status: 'ACTIVE' },
      { id: '06100857-15ef-48c0-80b4-2de6b55077ca', name: 'Amery Ice Shelf Deep Core Mission', status: 'ACTIVE' },
    ],
    personnel: [
      { id: 'bp-1', name: 'Dr. Rajesh Nair', role: 'Station Manager', qualification: 'Atmospheric Physics, PhD • 4th Winter-Over', status: 'At Station', contactInfo: 'Station Command' },
      { id: 'bp-2', name: 'Dr. Anita Singh', role: 'Medical Lead & Glaciologist', qualification: 'Intensive Care Specialist • Bharati Base Medical Lead', status: 'At Station', contactInfo: 'Medical Bay' },
      { id: 'bp-3', name: 'Sunita Rao', role: 'Power Systems Engineer', qualification: 'Power Systems & HVAC Arctic Specialist', status: 'At Station', contactInfo: 'Power Annex' },
      { id: 'bp-4', name: 'Karan Mehra', role: 'Heavy Mechanical Lead', qualification: 'PistenBully Diagnostic Specialist', status: 'At Station', contactInfo: 'Mechanical Workshop' },
      { id: 'bp-5', name: 'Rahul Sharma', role: 'Lead Field Scientist', qualification: 'Emergency Trauma Surgery • Ice Coring PI', status: 'Field Traverse', contactInfo: 'Field Team' },
      { id: 'bp-6', name: 'Vikram Joshi', role: 'Communications Officer', qualification: 'Polar Satellite Relays & Comms Lead', status: 'At Station', contactInfo: 'Comms Center' },
      { id: 'bp-7', name: 'Tashi Namgyal', role: 'Safety & Field Guide', qualification: 'Crevasse Rescue & Mountaineering Lead', status: 'At Station', contactInfo: 'Safety Ops' },
      { id: 'bp-8', name: 'Amitabh Sen', role: 'Environmental Scientist', qualification: 'Paleoclimate Firn Stratigraphy, MSc', status: 'At Station', contactInfo: 'Science Lab' },
    ],
    readinessScore: 92,
    inventoryItems: [
      {
        id: 'bi-med-1',
        name: 'Medical Trauma Kits',
        category: 'Medicine',
        currentStock: 8,
        unit: 'kits',
        safetyMinimum: 15,
        dailyConsumption: 2,
        daysOfSupply: 4,
        status: 'CRITICAL',
        lastUpdated: '10 min ago',
        upcomingDelivery: {
          quantity: 40,
          etaDays: 6,
          status: 'IN TRANSIT',
          vessel: 'MV Polar Queen',
        },
      },
      {
        id: 'bi-fuel-1',
        name: 'Arctic Low-Pour Diesel',
        category: 'Fuel',
        currentStock: 60,
        unit: 'drums (12,000L)',
        safetyMinimum: 40,
        dailyConsumption: 2,
        daysOfSupply: 30,
        status: 'HEALTHY',
        lastUpdated: '25 min ago',
        upcomingDelivery: {
          quantity: 20,
          etaDays: 12,
          status: 'IN TRANSIT',
          vessel: 'MV Polar Queen',
        },
      },
      {
        id: 'bi-wat-1',
        name: 'Potable Melt Water',
        category: 'Water',
        currentStock: 158,
        unit: 'units (m³)',
        safetyMinimum: 50,
        dailyConsumption: 0.8,
        daysOfSupply: 197,
        status: 'OPTIMAL',
        lastUpdated: '1 hour ago',
        upcomingDelivery: null,
      },
      {
        id: 'bi-spa-1',
        name: 'PistenBully Hydraulic Hoses & Spares',
        category: 'Spare Parts',
        currentStock: 14,
        unit: 'units',
        safetyMinimum: 20,
        dailyConsumption: 1.5,
        daysOfSupply: 9,
        status: 'CRITICAL',
        lastUpdated: '1 hour ago',
        upcomingDelivery: {
          quantity: 30,
          etaDays: 4,
          status: 'IN TRANSIT',
          vessel: 'C-130 Hercules Flight IL-76',
        },
      },
      {
        id: 'bi-food-1',
        name: 'Balanced Nutrient Winter Rations',
        category: 'Food',
        currentStock: 3600,
        unit: 'kg',
        safetyMinimum: 1500,
        dailyConsumption: 45,
        daysOfSupply: 80,
        status: 'OPTIMAL',
        lastUpdated: '4 hours ago',
        upcomingDelivery: {
          quantity: 1500,
          etaDays: 12,
          status: 'IN TRANSIT',
          vessel: 'MV Polar Queen',
        },
      },
      {
        id: 'bi-sci-1',
        name: '800m Deep Coring Drill Bit Spares',
        category: 'Scientific',
        currentStock: 2,
        unit: 'rigs',
        safetyMinimum: 3,
        dailyConsumption: 0.1,
        daysOfSupply: 20,
        status: 'LOW',
        lastUpdated: '2 hours ago',
        upcomingDelivery: {
          quantity: 2,
          etaDays: 18,
          status: 'SCHEDULED',
          vessel: 'Convoy Sledge Train B',
        },
      },
      {
        id: 'bi-com-1',
        name: 'Iridium Extreme Satellite Transceivers',
        category: 'Communication',
        currentStock: 12,
        unit: 'units',
        safetyMinimum: 6,
        dailyConsumption: 0.1,
        daysOfSupply: 120,
        status: 'OPTIMAL',
        lastUpdated: '15 min ago',
        upcomingDelivery: null,
      },
      {
        id: 'bi-saf-1',
        name: 'Crevasse Extrication Rescue Pulleys',
        category: 'Safety',
        currentStock: 16,
        unit: 'sets',
        safetyMinimum: 10,
        dailyConsumption: 0.2,
        daysOfSupply: 80,
        status: 'HEALTHY',
        lastUpdated: '1 day ago',
        upcomingDelivery: null,
      },
    ],
    deliveries: [
      {
        id: 'del-bh-1',
        itemName: 'Medical Kits & Trauma Dressings',
        category: 'Medicine',
        quantity: 40,
        unit: 'kits',
        etaDays: 6,
        status: 'IN TRANSIT',
        vessel: 'MV Polar Queen',
      },
      {
        id: 'del-bh-2',
        itemName: 'PistenBully Heavy Hydraulic Hoses',
        category: 'Spare Parts',
        quantity: 30,
        unit: 'units',
        etaDays: 4,
        status: 'IN TRANSIT',
        vessel: 'C-130 Hercules Flight IL-76',
      },
      {
        id: 'del-bh-3',
        itemName: 'Arctic Low-Pour Diesel Fuel Tanks',
        category: 'Fuel',
        quantity: 20,
        unit: 'drums',
        etaDays: 12,
        status: 'IN TRANSIT',
        vessel: 'MV Polar Queen',
      },
      {
        id: 'del-bh-4',
        itemName: '800m Deep Coring Drill Rig Assembly',
        category: 'Scientific',
        quantity: 2,
        unit: 'rigs',
        etaDays: 18,
        status: 'SCHEDULED',
        vessel: 'Convoy Sledge Train B',
      },
    ],
  },

  maitri: {
    name: 'Maitri Station',
    code: 'MAITRI',
    region: 'Schirmacher Oasis, Queen Maud Land, East Antarctica',
    latitude: -70.766,
    longitude: 11.732,
    capacity: 35,
    status: 'Operational',
    manager: {
      name: 'Dr. Suresh Sen',
      role: 'Station Manager',
      contact: '',
      status: 'Connected',
    },
    activeExpeditions: [
      { id: '2c2ab3c1-018a-4761-9c02-ac1a3bd9d3fb', name: '44th Indian Antarctic Expedition', status: 'ACTIVE' },
      { id: 'ddbb532f-41ed-4fc6-b66a-4702f058eb24', name: 'Queen Maud Land Traverse', status: 'ACTIVE' },
    ],
    personnel: [
      { id: 'mp-1', name: 'Dr. Suresh Sen', role: 'Station Manager', qualification: 'General Surgery & Triage • Maitri Hospital Chief', status: 'At Station', contactInfo: 'Station Command' },
      { id: 'mp-2', name: 'Capt. Vikram Sethi', role: 'Convoy Operations Lead', qualification: 'Polar Convoy Logistics Commander • 6 Deep Traverses', status: 'In Transit', contactInfo: 'Convoy Lead' },
      { id: 'mp-3', name: 'Arjun Das', role: 'Crevasse Detection Specialist', qualification: 'Glaciology & Crevasse Detection Specialist, PhD', status: 'Field Mission', contactInfo: 'Field Team' },
      { id: 'mp-4', name: 'Tenzing Norbu', role: 'Scout & Heavy Vehicle Tech', qualification: 'High-Latitude Route Navigation & Scout', status: 'In Transit', contactInfo: 'Traverse Cat' },
      { id: 'mp-5', name: 'Pooja Verma', role: 'Meteorologist & Geophysicist', qualification: 'Katabatic Wind Modeling, MSc', status: 'At Station', contactInfo: 'Meteo Mast' },
      { id: 'mp-6', name: 'Dinesh Kumar', role: 'Diesel Power Tech', qualification: 'Arctic Generator Maintenance Lead', status: 'At Station', contactInfo: 'Power Plant' },
    ],
    readinessScore: 88,
    inventoryItems: [
      {
        id: 'mi-med-1',
        name: 'Maitri Medical Reserve Surplus',
        category: 'Medicine',
        currentStock: 24,
        unit: 'units',
        safetyMinimum: 18,
        dailyConsumption: 1.3,
        daysOfSupply: 18,
        status: 'LOW',
        lastUpdated: '15 min ago',
        upcomingDelivery: {
          quantity: 40,
          etaDays: 6,
          status: 'IN TRANSIT',
          vessel: 'MV Polar Queen',
        },
      },
      {
        id: 'mi-fuel-1',
        name: 'Arctic Diesel Fuel',
        category: 'Fuel',
        currentStock: 60,
        unit: 'drums (12,000L)',
        safetyMinimum: 40,
        dailyConsumption: 2,
        daysOfSupply: 30,
        status: 'HEALTHY',
        lastUpdated: '30 min ago',
        upcomingDelivery: {
          quantity: 20,
          etaDays: 12,
          status: 'IN TRANSIT',
          vessel: 'Heavy Convoy Sledge Train',
        },
      },
      {
        id: 'mi-fuel-2',
        name: 'Convoy Overland Kerosene Fuel Cache',
        category: 'Fuel',
        currentStock: 15,
        unit: 'containers (3,000L)',
        safetyMinimum: 30,
        dailyConsumption: 2.5,
        daysOfSupply: 6,
        status: 'CRITICAL',
        lastUpdated: '45 min ago',
        upcomingDelivery: {
          quantity: 50,
          etaDays: 8,
          status: 'IN TRANSIT',
          vessel: 'Tracked Convoy Lead',
        },
      },
      {
        id: 'mi-wat-1',
        name: 'Priyadarshini Lake Water Filtration',
        category: 'Water',
        currentStock: 180,
        unit: 'units (m³)',
        safetyMinimum: 40,
        dailyConsumption: 0.9,
        daysOfSupply: 200,
        status: 'OPTIMAL',
        lastUpdated: '2 hours ago',
        upcomingDelivery: null,
      },
      {
        id: 'mi-spa-1',
        name: 'PistenBully Track Replacement Links',
        category: 'Spare Parts',
        currentStock: 14,
        unit: 'units',
        safetyMinimum: 20,
        dailyConsumption: 1.5,
        daysOfSupply: 9,
        status: 'CRITICAL',
        lastUpdated: '2 days ago',
        upcomingDelivery: {
          quantity: 30,
          etaDays: 4,
          status: 'IN TRANSIT',
          vessel: 'Traverse Resupply Convoy',
        },
      },
      {
        id: 'mi-sci-1',
        name: 'Ground-Penetrating Radar Field Units',
        category: 'Scientific',
        currentStock: 3,
        unit: 'units',
        safetyMinimum: 2,
        dailyConsumption: 0.05,
        daysOfSupply: 60,
        status: 'OPTIMAL',
        lastUpdated: '1 hour ago',
        upcomingDelivery: null,
      },
      {
        id: 'mi-com-1',
        name: 'Satellite Telephony Ground Station Relays',
        category: 'Communication',
        currentStock: 2,
        unit: 'units',
        safetyMinimum: 2,
        dailyConsumption: 0.02,
        daysOfSupply: 100,
        status: 'OPTIMAL',
        lastUpdated: '45 min ago',
        upcomingDelivery: null,
      },
      {
        id: 'mi-saf-1',
        name: 'Sledge Guy-Wires & Anchor Stakes',
        category: 'Safety',
        currentStock: 40,
        unit: 'sets',
        safetyMinimum: 25,
        dailyConsumption: 0.4,
        daysOfSupply: 100,
        status: 'OPTIMAL',
        lastUpdated: '1 day ago',
        upcomingDelivery: null,
      },
    ],
    deliveries: [
      {
        id: 'del-mt-1',
        itemName: 'PistenBully Track Replacement Links',
        category: 'Spare Parts',
        quantity: 30,
        unit: 'units',
        etaDays: 4,
        status: 'IN TRANSIT',
        vessel: 'Traverse Resupply Convoy',
      },
      {
        id: 'del-mt-2',
        itemName: 'Maitri Emergency Medical Kits',
        category: 'Medicine',
        quantity: 40,
        unit: 'units',
        etaDays: 6,
        status: 'IN TRANSIT',
        vessel: 'MV Polar Queen',
      },
      {
        id: 'del-mt-3',
        itemName: 'Arctic Convoy Kerosene Fuel Drums',
        category: 'Fuel',
        quantity: 50,
        unit: 'containers',
        etaDays: 8,
        status: 'IN TRANSIT',
        vessel: 'Tracked Convoy Lead',
      },
    ],
  },

  himadri: {
    name: 'Himadri Polar Research Base',
    code: 'HIMADRI',
    region: 'Ny-Ålesund, Svalbard, Arctic Reference Collab',
    latitude: 78.92,
    longitude: 11.92,
    capacity: 25,
    status: 'Operational',
    manager: {
      name: 'Dr. Collab Lead',
      role: 'Arctic Research Coordinator',
      contact: 'Iridium 8816-HIMADRI',
      status: 'Connected',
    },
    activeExpeditions: [
      { id: '06100857-15ef-48c0-80b4-2de6b55077ca', name: 'Amery Ice Shelf Deep Core Mission', status: 'ACTIVE' },
    ],
    personnel: [
      { id: 'hp-1', name: 'Dr. Collab Lead', role: 'Station Coordinator', qualification: 'High-Latitude Bipolar Atmospheric Science', status: 'At Station', contactInfo: 'Comms Room 1' },
      { id: 'hp-2', name: 'Lars Lindqvist', role: 'Cryospheric Analyst', qualification: 'Arctic Sea-Ice Remote Sensing', status: 'At Station', contactInfo: 'Lab Annex' },
      { id: 'hp-3', name: 'Deepa Roy', role: 'Marine Biologist', qualification: 'Polar Plankton Cryo-Phenology, PhD', status: 'At Station', contactInfo: 'Wet Lab 2' },
      { id: 'hp-4', name: 'Jonas Berg', role: 'Electronics Specialist', qualification: 'Extreme Weather Instrumentation', status: 'At Station', contactInfo: 'Meteo Mast' },
    ],
    readinessScore: 94,
    inventoryItems: [
      {
        id: 'hi-med-1',
        name: 'Arctic Medical Emergency Chest',
        category: 'Medicine',
        currentStock: 140,
        unit: 'units',
        safetyMinimum: 80,
        dailyConsumption: 2,
        daysOfSupply: 70,
        status: 'OPTIMAL',
        lastUpdated: '3 hours ago',
        upcomingDelivery: null,
      },
      {
        id: 'hi-fuel-1',
        name: 'Aviation & Research Turbine Fuel',
        category: 'Fuel',
        currentStock: 22000,
        unit: 'Liters',
        safetyMinimum: 15000,
        dailyConsumption: 600,
        daysOfSupply: 36,
        status: 'HEALTHY',
        lastUpdated: '20 min ago',
        upcomingDelivery: {
          quantity: 10000,
          etaDays: 14,
          status: 'IN TRANSIT',
          vessel: 'Polar Supply Vessel Svalbard',
        },
      },
      {
        id: 'hi-spa-1',
        name: 'Snowmobile Drive Belts & Spark Plugs',
        category: 'Spare Parts',
        currentStock: 5,
        unit: 'units',
        safetyMinimum: 12,
        dailyConsumption: 0.5,
        daysOfSupply: 10,
        status: 'CRITICAL',
        lastUpdated: '3 days ago',
        upcomingDelivery: {
          quantity: 15,
          etaDays: 7,
          status: 'IN TRANSIT',
          vessel: 'Nordic Air Shuttle',
        },
      },
      {
        id: 'hi-food-1',
        name: 'Nutritional Dry Supplies',
        category: 'Food',
        currentStock: 2400,
        unit: 'kg',
        safetyMinimum: 1000,
        dailyConsumption: 30,
        daysOfSupply: 80,
        status: 'OPTIMAL',
        lastUpdated: '12 hours ago',
        upcomingDelivery: null,
      },
      {
        id: 'hi-com-1',
        name: 'High-Bandwidth Inmarsat Satcom Gateway',
        category: 'Communication',
        currentStock: 3,
        unit: 'units',
        safetyMinimum: 2,
        dailyConsumption: 0.02,
        daysOfSupply: 150,
        status: 'OPTIMAL',
        lastUpdated: '25 min ago',
        upcomingDelivery: null,
      },
    ],
    deliveries: [
      {
        id: 'del-hi-1',
        itemName: 'Snowmobile Arctic Belts & Plugs',
        category: 'Spare Parts',
        quantity: 15,
        unit: 'units',
        etaDays: 7,
        status: 'IN TRANSIT',
        vessel: 'Nordic Air Shuttle',
      },
      {
        id: 'del-hi-2',
        itemName: 'Aviation Turbine Fuel Reserve',
        category: 'Fuel',
        quantity: 10000,
        unit: 'Liters',
        etaDays: 14,
        status: 'IN TRANSIT',
        vessel: 'Polar Supply Vessel Svalbard',
      },
    ],
  },
};

/**
 * Fetch all registered polar stations with rich operational details, managers, and inventory.
 */
export async function getAllPolarStations(): Promise<StationFullRecord[]> {
  try {
    const rawStations = await fetchStations();

    return Object.entries(CANONICAL_STATIONS).map(([key, canonical]) => {
      const match = rawStations.find(
        (rs) =>
          rs.name.toLowerCase().includes(key) ||
          rs.code.toLowerCase().includes(key) ||
          (key === 'bharati' && rs.name.includes('Bharati')) ||
          (key === 'maitri' && rs.name.includes('Maitri')) ||
          (key === 'himadri' && rs.name.includes('Himadri'))
      );

      // Group inventory by category
      const categorizedInventory: Record<string, any[]> = {};
      canonical.inventoryItems.forEach((item) => {
        if (!categorizedInventory[item.category]) {
          categorizedInventory[item.category] = [];
        }
        categorizedInventory[item.category].push({
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.currentStock,
          unit: item.unit,
          status: item.status === 'OPTIMAL' || item.status === 'HEALTHY' ? 'Available' : item.status === 'LOW' ? 'Low' : 'Critical',
          lastUpdated: item.lastUpdated,
        });
      });

      return {
        id: match?.id || `st-${key}`,
        expeditionId: match?.expeditionId || canonical.activeExpeditions[0]?.id || '',
        name: canonical.name,
        code: canonical.code,
        region: canonical.region,
        latitude: match?.latitude ?? canonical.latitude,
        longitude: match?.longitude ?? canonical.longitude,
        capacity: match?.capacity ?? canonical.capacity,
        status: match?.status ?? canonical.status,
        currentRisk: match?.currentRisk ?? 12,
        weather: match?.weather || [
          {
            temperature: key === 'maitri' ? -14.2 : key === 'bharati' ? -18.5 : -4.2,
            condition: key === 'maitri' ? 'Partly Cloudy' : key === 'bharati' ? 'Katabatic Winds' : 'Clear',
            windSpeedKnots: key === 'maitri' ? 16 : 22,
            visibility: '15 km (Good)',
          },
        ],
        stationManager: canonical.manager,
        activeExpeditions: canonical.activeExpeditions,
        inventoryCount: canonical.inventoryItems.length,
        personnelCount: canonical.personnel.length,
        assignedPersonnelList: canonical.personnel,
        categorizedInventory,
        inventoryItems: canonical.inventoryItems,
        deliveries: canonical.deliveries,
        readinessScore: canonical.readinessScore,
      };
    });
  } catch (err) {
    console.error('Failed to load stations from backend, using canonical fallback:', err);
    return Object.entries(CANONICAL_STATIONS).map(([key, canonical]) => {
      const categorizedInventory: Record<string, any[]> = {};
      canonical.inventoryItems.forEach((item) => {
        if (!categorizedInventory[item.category]) categorizedInventory[item.category] = [];
        categorizedInventory[item.category].push({
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.currentStock,
          unit: item.unit,
          status: item.status === 'OPTIMAL' || item.status === 'HEALTHY' ? 'Available' : item.status === 'LOW' ? 'Low' : 'Critical',
          lastUpdated: item.lastUpdated,
        });
      });

      return {
        id: `st-${key}`,
        expeditionId: canonical.activeExpeditions[0]?.id || '',
        name: canonical.name,
        code: canonical.code,
        region: canonical.region,
        latitude: canonical.latitude,
        longitude: canonical.longitude,
        capacity: canonical.capacity,
        status: canonical.status,
        currentRisk: 12,
        weather: [{ temperature: -15, condition: 'Clear', windSpeedKnots: 18, visibility: '15 km' }],
        stationManager: canonical.manager,
        activeExpeditions: canonical.activeExpeditions,
        inventoryCount: canonical.inventoryItems.length,
        personnelCount: canonical.personnel.length,
        assignedPersonnelList: canonical.personnel,
        categorizedInventory,
        inventoryItems: canonical.inventoryItems,
        deliveries: canonical.deliveries,
        readinessScore: canonical.readinessScore,
      };
    });
  }
}

/**
 * Fetch detailed record for a single station by id or code
 */
export async function getStationRecord(stationIdOrCode: string): Promise<StationFullRecord | null> {
  const all = await getAllPolarStations();
  const s = stationIdOrCode.toLowerCase().replace(/^st-/, '');
  return (
    all.find(
      (st) =>
        st.id.toLowerCase() === stationIdOrCode.toLowerCase() ||
        st.id.toLowerCase() === `st-${s}` ||
        st.code.toLowerCase() === s ||
        st.name.toLowerCase().includes(s)
    ) || all[0] || null
  );
}

/**
 * Send an inventory threshold alert to the station manager
 */
export async function sendStationManagerAlert(params: {
  station: StationFullRecord;
  item: StationInventoryItem;
  message: string;
}): Promise<any> {
  const title = `Low Stock Alert: ${params.item.name} (${params.station.name})`;
  const reason = `Current stock (${params.item.currentStock} ${params.item.unit}) has breached safety limit (${params.item.safetyMinimum} ${params.item.unit}). Days of supply: ${params.item.daysOfSupply} days.`;

  return createAlert({
    expeditionId: params.station.activeExpeditions[0]?.id || params.station.expeditionId,
    stationId: params.station.id,
    type: 'INVENTORY_LOW',
    title,
    severity: params.item.status === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    source: 'Admin Mission Control - Inventory Intelligence',
    affectedEntity: `${params.station.name} - ${params.item.name}`,
    reason,
    impact: `Stockout expected in ${params.item.daysOfSupply} days if replenishment is not scheduled.`,
    recommendedAction: `Station Manager (${params.station.stationManager.name}) review and forward requirement to Logistics Coordinator.`,
    status: 'ACTIVE',
  });
}

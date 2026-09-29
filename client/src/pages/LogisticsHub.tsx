import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
  Truck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Compass,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Sparkles,
  ChevronRight,
  Calendar,
  X,
  Radio,
  Package,
  Layers,
  MapPin,
  Check,
  Ban,
  Eye,
  Plane,
  Anchor,
  Merge,
  ClipboardList,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Tag,
  ShoppingBag,
  Send,
  RefreshCw,
  Info,
  CheckSquare,
  Square,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useExpedition } from '../context/ExpeditionContext';
import { Modal } from '../components/common/Modal';
import { fetchRestockRequests, updateRestockRequest, fetchStations, createOperationalRequirement } from '../services/api';
import { Station } from '../types';
import { getUserScope } from '../utils/userScope';

// -------------------------------------------------------------
// 1. DATA MODELS & TYPES
// -------------------------------------------------------------

export type RequirementLifecycleStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Merged'
  | 'In Procurement'
  | 'Ordered'
  | 'In Transit'
  | 'Partially Fulfilled'
  | 'Fulfilled'
  | 'Cancelled';

export type OperationalUrgency = 'NORMAL' | 'HIGH' | 'CRITICAL';

export type SupplyCategory =
  | 'Medical'
  | 'Fuel'
  | 'Food'
  | 'Equipment'
  | 'Spare Parts'
  | 'Scientific'
  | 'Communication'
  | 'Safety'
  | 'General';

export interface SupplyRequirement {
  id: string;
  sourceType: 'Station' | 'Expedition' | 'Logistics';
  sourceName: string;
  stationId?: string;
  expeditionId?: string;
  raisedBy: string;
  role: string;
  itemName: string;
  category: SupplyCategory;
  quantity: number;
  unit: string;
  requiredWithin: string;
  requiredByDate: string;
  urgency: OperationalUrgency;
  urgencyReason?: string;
  missionContext?: string;
  aiForecast?: {
    recommendation: OperationalUrgency;
    recommendedQuantity: number;
    recommendedRequiredBy: string;
    projectedStockoutDays: number;
    projectedStockoutDate: string;
    rationale: string;
  } | null;
  status: RequirementLifecycleStatus;
  createdAt: string;
  notes?: string;
  // Consolidation metadata
  mergedIntoId?: string;
  mergedRequirementIds?: string[];
  isConsolidated?: boolean;
  clarificationNotes?: string;
  // Supply & Inventory Context
  supplyContext?: {
    currentStock: number;
    minimumSafeStock: number;
    dailyConsumption: number;
    daysOfSupply: number;
    incomingQuantity: number;
    expectedDelivery: string;
    projectedStockout: string;
  };
  // Downstream procurement
  procurementData?: {
    tenderReference: string;
    procurementStage: 'Draft Tender' | 'Published / RFQ' | 'Bid Evaluation' | 'Award Finalized';
    portal: 'GeM' | 'NCPOR Portal' | 'Direct Emergency';
    targetClosingDate: string;
    estimatedBudget?: string;
  };
  // Downstream order
  orderData?: {
    orderReference: string;
    supplierName: string;
    orderDate: string;
    orderStatus: 'Finalized' | 'Shipment Prepared' | 'Dispatched';
    contractValue?: string;
    expectedDispatch: string;
    expectedArrival: string;
  };
  // Downstream shipment
  shipmentData?: {
    shipmentId: string;
    carrierOrVessel: string;
    transportMode: 'Maritime Vessel' | 'Polar Air Corridor' | 'Over-Snow Traverse' | 'Staging Hub';
    currentStage: 'Cape Town Staging' | 'Ocean Transit' | 'Ice Runway Approach' | 'Traverse Staging' | 'At Station' | 'Delivered';
    eta: string;
    delayStatus: 'On Schedule' | 'Delayed (+24h)' | 'Delayed (+48h)' | 'Severe Weather Hold';
    destination: string;
  };
}

export interface FinalizedOrder {
  id: string;
  orderName: string;
  itemSummary: string;
  quantity: number;
  unit: string;
  destinationStation: string;
  awardedSupplier: string;
  tenderReference: string;
  orderStatus: 'Finalized' | 'Shipment Prepared' | 'Dispatched';
  expectedDispatch: string;
  expectedArrival: string;
  linkedRequirementId?: string;
}

export interface OngoingShipment {
  id: string;
  name: string;
  carrierOrVessel: string;
  transportMode: 'Maritime Vessel' | 'Polar Air Corridor' | 'Over-Snow Traverse';
  destinationStation: string;
  currentStage: string;
  eta: string;
  delayHours: number;
  status: 'In Transit' | 'Delayed in Port' | 'At Station' | 'Delivered';
  linkedRequirementId?: string;
}

export interface ProcurementTender {
  id: string;
  title: string;
  tenderCode: string;
  portal: 'GeM' | 'NCPOR Portal' | 'Direct Emergency';
  category: string;
  status: 'Draft' | 'Published / RFQ' | 'Bid Evaluation' | 'Award Finalized';
  awardedSupplier?: string;
  closingDate: string;
  destination: string;
  linkedRequirementId?: string;
}

interface LogisticsHubProps {
  initialTab?: string;
  onNavigate?: (path: string) => void;
}

// -------------------------------------------------------------
// 2. COMPONENT IMPLEMENTATION
// -------------------------------------------------------------

export const LogisticsHub: React.FC<LogisticsHubProps> = ({ initialTab = 'requirements', onNavigate }) => {
  const { currentUser, isLogisticsCommander, isStationManager, isExpeditionLeader, isAdmin } = useAuth();
  const { expeditions, triggerRefresh } = useExpedition();

  const scope = useMemo(() => getUserScope(currentUser), [currentUser]);
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    fetchStations().then((data) => {
      if (data && data.length > 0) setStations(data);
    }).catch(() => {});
  }, []);

  const currentStation = useMemo(() => {
    if (!scope.primaryStationId) return stations[0] || null;
    return stations.find(
      (s) =>
        s.id === scope.primaryStationId ||
        s.code?.toLowerCase() === scope.primaryStationId?.toLowerCase() ||
        s.name.toLowerCase().includes(scope.primaryStationId?.toLowerCase() || '')
    ) || null;
  }, [stations, scope.primaryStationId]);

  const currentStationName = currentStation?.name || (scope.primaryStationId?.toLowerCase().includes('bharati') ? 'Bharati Station' : scope.primaryStationId?.toLowerCase().includes('maitri') ? 'Maitri Station' : 'Bharati Station');

  const currentExpedition = useMemo(() => {
    if (!scope.primaryExpeditionId) return expeditions[0] || null;
    return expeditions.find(
      (e) =>
        e.id === scope.primaryExpeditionId ||
        e.id?.toLowerCase().includes(scope.primaryExpeditionId?.toLowerCase() || '') ||
        e.title.toLowerCase().includes('amery')
    ) || expeditions[0] || null;
  }, [expeditions, scope.primaryExpeditionId]);

  const currentExpeditionTitle = currentExpedition?.title || 'Amery Ice Shelf Deep Core Mission';

  // Active top-level operational tab
  const [activeTab, setActiveTab] = useState<'requirements' | 'procurement' | 'finalized' | 'tracking'>(() => {
    if (initialTab === 'finalized') return 'finalized';
    if (initialTab === 'tracking') return 'tracking';
    if (initialTab === 'procurement' || initialTab === 'suppliers') return 'procurement';
    return 'requirements';
  });

  useEffect(() => {
    if (initialTab === 'finalized') setActiveTab('finalized');
    else if (initialTab === 'tracking') setActiveTab('tracking');
    else if (initialTab === 'procurement' || initialTab === 'suppliers') setActiveTab('procurement');
    else if (initialTab === 'requirements') setActiveTab('requirements');
  }, [initialTab]);

  // Role scoping toggle: Station Manager is strictly "my-station", Expedition Leader is "my-expedition"
  const [scopeFilter, setScopeFilter] = useState<'all' | 'my-station' | 'my-expedition'>(() => {
    if (isStationManager) return 'my-station';
    if (isExpeditionLeader) return 'my-expedition';
    return 'all';
  });

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Station' | 'Expedition'>('All');
  const [stationFilter, setStationFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'CRITICAL' | 'HIGH' | 'NORMAL'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'urgency' | 'requiredBy' | 'recentlyAdded' | 'quantity'>('urgency');
  const [commanderTriageFilter, setCommanderTriageFilter] = useState<'all' | 'needs-action' | 'critical' | 'consolidation' | 'procuring'>('all');

  // Selected Requirements for Bulk / Consolidation
  const [selectedReqIds, setSelectedReqIds] = useState<Set<string>>(new Set());

  // Inspecting Requirement (Right-side detail drawer)
  const [inspectingRequirement, setInspectingRequirement] = useState<SupplyRequirement | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConsolidateModalOpen, setIsConsolidateModalOpen] = useState(false);
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [isFinalizeOrderModalOpen, setIsFinalizeOrderModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [clarificationText, setClarificationText] = useState('');

  // Target requirement for sub-actions (when triggering from drawer or row)
  const [targetReqForAction, setTargetReqForAction] = useState<SupplyRequirement | null>(null);

  // Add Requirement Form State
  const [newReqType, setNewReqType] = useState<'Station' | 'Expedition'>('Station');
  const [newReqTarget, setNewReqTarget] = useState(currentStationName);

  useEffect(() => {
    if (isStationManager) {
      setNewReqType('Station');
      setNewReqTarget(currentStationName);
    } else if (isExpeditionLeader) {
      setNewReqType('Expedition');
      setNewReqTarget(currentExpeditionTitle);
    }
  }, [isStationManager, isExpeditionLeader, currentStationName, currentExpeditionTitle]);

  const [newReqItem, setNewReqItem] = useState('');
  const [newReqCategory, setNewReqCategory] = useState<SupplyCategory>('Medical');
  const [newReqQty, setNewReqQty] = useState<number>(30);
  const [newReqUnit, setNewReqUnit] = useState('kits');
  const [newReqRequiredWithin, setNewReqRequiredWithin] = useState('14 days');
  const [newReqUrgency, setNewReqUrgency] = useState<OperationalUrgency>('HIGH');
  const [newReqReason, setNewReqReason] = useState('');
  const [newReqNotes, setNewReqNotes] = useState('');

  // Consolidation Modal State
  const [consolidationTitle, setConsolidationTitle] = useState('Consolidated Medical Requisition');
  const [consolidationNotes, setConsolidationNotes] = useState('');

  // Procurement Modal State
  const [tenderRefInput, setTenderRefInput] = useState('');
  const [tenderPortal, setTenderPortal] = useState<'GeM' | 'NCPOR Portal' | 'Direct Emergency'>('GeM');
  const [tenderTargetDate, setTenderTargetDate] = useState('2026-10-15');
  const [tenderEstimatedBudget, setTenderEstimatedBudget] = useState('INR 8,50,000');

  // Finalize Order Modal State
  const [orderSupplier, setOrderSupplier] = useState('Apex Polar Health Systems Ltd.');
  const [orderRefInput, setOrderRefInput] = useState('');
  const [orderDispatchDate, setOrderDispatchDate] = useState('2026-10-10');
  const [orderArrivalDate, setOrderArrivalDate] = useState('2026-10-22');

  // Dispatch Shipment Modal State
  const [shipmentCarrier, setShipmentCarrier] = useState('MV Polar Queen');
  const [shipmentMode, setShipmentMode] = useState<'Maritime Vessel' | 'Polar Air Corridor' | 'Over-Snow Traverse'>('Maritime Vessel');
  const [shipmentStage, setShipmentStage] = useState<'Cape Town Staging' | 'Ocean Transit' | 'Ice Runway Approach' | 'Traverse Staging'>('Ocean Transit');
  const [shipmentEta, setShipmentEta] = useState('2026-10-22');

  // -------------------------------------------------------------
  // 3. INITIAL DEMO DATA (Central Operational Pool)
  // -------------------------------------------------------------
  const [requirements, setRequirements] = useState<SupplyRequirement[]>([
    {
      id: 'req-101',
      sourceType: 'Station',
      sourceName: 'Maitri Station',
      stationId: 'maitri',
      raisedBy: 'Dr. Ramesh Rao',
      role: 'Station Manager',
      itemName: 'Field Medical Kits',
      category: 'Medical',
      quantity: 20,
      unit: 'kits',
      requiredWithin: '12 days',
      requiredByDate: '12 Oct 2026',
      urgency: 'CRITICAL',
      urgencyReason: 'Traverse medical bay buffer exhausted following emergency frostbite evacuation',
      missionContext: 'Maitri base wintering crew emergency staging',
      aiForecast: {
        recommendation: 'CRITICAL',
        recommendedQuantity: 25,
        recommendedRequiredBy: '09 Oct 2026',
        projectedStockoutDays: 6,
        projectedStockoutDate: '09 Oct 2026',
        rationale: 'Current consumption rate is projected to reduce stock below the safe level before the next expected replenishment.',
      },
      status: 'Under Review',
      createdAt: '2026-09-24',
      notes: 'Standard expedition medical consumables for pre-season traverse deployment.',
      supplyContext: {
        currentStock: 4,
        minimumSafeStock: 15,
        dailyConsumption: 1.5,
        daysOfSupply: 3,
        incomingQuantity: 0,
        expectedDelivery: 'No active shipment',
        projectedStockout: '09 Oct 2026',
      },
    },
    {
      id: 'req-102',
      sourceType: 'Expedition',
      sourceName: 'Amery Ice Shelf Deep Core Mission',
      expeditionId: 'amery-core',
      raisedBy: 'Rahul Sharma',
      role: 'Expedition Planner',
      itemName: 'Field Medical Trauma Kits',
      category: 'Medical',
      quantity: 10,
      unit: 'kits',
      requiredWithin: '14 days',
      requiredByDate: '14 Oct 2026',
      urgency: 'HIGH',
      urgencyReason: 'Deep ice-core remote field camp deployment requires dedicated trauma kits',
      missionContext: 'Remote drilling traverse 450km inland from base',
      aiForecast: {
        recommendation: 'HIGH',
        recommendedQuantity: 12,
        recommendedRequiredBy: '12 Oct 2026',
        projectedStockoutDays: 9,
        projectedStockoutDate: '11 Oct 2026',
        rationale: 'Traverse camp staging lacks trauma stabilization reserve. Consolidate with Maitri station order.',
      },
      status: 'Under Review',
      createdAt: '2026-09-25',
      notes: 'Sub-zero insulated medical storage containers requested for mobile field sledges.',
      supplyContext: {
        currentStock: 2,
        minimumSafeStock: 8,
        dailyConsumption: 0.8,
        daysOfSupply: 2.5,
        incomingQuantity: 0,
        expectedDelivery: 'Awaiting consolidation',
        projectedStockout: '11 Oct 2026',
      },
    },
    {
      id: 'req-103',
      sourceType: 'Expedition',
      sourceName: 'Queen Maud Land Glaciology',
      expeditionId: 'qml-glacio',
      raisedBy: 'Dr. Ananya Singh',
      role: 'Expedition Planner',
      itemName: 'Field Medical Emergency Kits',
      category: 'Medical',
      quantity: 15,
      unit: 'kits',
      requiredWithin: '16 days',
      requiredByDate: '16 Oct 2026',
      urgency: 'HIGH',
      urgencyReason: 'Glaciology crevasse rescue team consumables replenishment',
      missionContext: 'Active glaciological mapping on inland nunataks',
      aiForecast: {
        recommendation: 'HIGH',
        recommendedQuantity: 15,
        recommendedRequiredBy: '14 Oct 2026',
        projectedStockoutDays: 12,
        projectedStockoutDate: '14 Oct 2026',
        rationale: 'Opportunity to consolidate with Maitri Station and Amery Mission for bulk medical tender award.',
      },
      status: 'Under Review',
      createdAt: '2026-09-26',
      notes: 'Compatible with standard NATO sub-zero trauma packs.',
      supplyContext: {
        currentStock: 3,
        minimumSafeStock: 10,
        dailyConsumption: 0.6,
        daysOfSupply: 5,
        incomingQuantity: 0,
        expectedDelivery: 'Awaiting consolidation',
        projectedStockout: '14 Oct 2026',
      },
    },
    {
      id: 'req-104',
      sourceType: 'Station',
      sourceName: 'Bharati Station',
      stationId: 'bharati',
      raisedBy: 'Vikram Joshi',
      role: 'Station Manager',
      itemName: 'Generator Cold-Start Filters',
      category: 'Spare Parts',
      quantity: 12,
      unit: 'sets',
      requiredWithin: '8 days',
      requiredByDate: '08 Oct 2026',
      urgency: 'CRITICAL',
      urgencyReason: 'Station primary micro-grid backup generator filter clogged during active blizzard',
      missionContext: 'Larsemann Hills coastal station power grid stability',
      aiForecast: {
        recommendation: 'CRITICAL',
        recommendedQuantity: 18,
        recommendedRequiredBy: '06 Oct 2026',
        projectedStockoutDays: 4,
        projectedStockoutDate: '06 Oct 2026',
        rationale: 'Station micro-grid operating on secondary backup genset during active katabatic weather pattern.',
      },
      status: 'In Procurement',
      createdAt: '2026-09-22',
      notes: 'Urgent replacement filters for 125 kVA Volvo Penta genset power arrays.',
      supplyContext: {
        currentStock: 2,
        minimumSafeStock: 8,
        dailyConsumption: 0.4,
        daysOfSupply: 5,
        incomingQuantity: 12,
        expectedDelivery: '10 Oct 2026',
        projectedStockout: '06 Oct 2026',
      },
      procurementData: {
        tenderReference: 'GeM/2026/B/882190',
        procurementStage: 'Bid Evaluation',
        portal: 'GeM',
        targetClosingDate: '2026-10-02',
        estimatedBudget: 'INR 3,40,000',
      },
      orderData: {
        orderReference: 'ORD-2026-042',
        supplierName: 'Kirloskar Polar Engineering Division',
        orderDate: '2026-09-26',
        orderStatus: 'Finalized',
        contractValue: 'INR 3,25,000',
        expectedDispatch: '2026-10-02',
        expectedArrival: '2026-10-10',
      },
    },
    {
      id: 'req-105',
      sourceType: 'Station',
      sourceName: 'Maitri Station',
      stationId: 'maitri',
      raisedBy: 'Dr. Ramesh Rao',
      role: 'Station Manager',
      itemName: 'Polar Aviation Kerosene (ATF-50)',
      category: 'Fuel',
      quantity: 4500,
      unit: 'liters',
      requiredWithin: '25 days',
      requiredByDate: '25 Oct 2026',
      urgency: 'NORMAL',
      urgencyReason: 'Scheduled Twin Otter ski-plane corridor flight replenishment',
      missionContext: 'Inter-continental air link support',
      aiForecast: {
        recommendation: 'NORMAL',
        recommendedQuantity: 4500,
        recommendedRequiredBy: '25 Oct 2026',
        projectedStockoutDays: 28,
        projectedStockoutDate: '28 Oct 2026',
        rationale: 'Fuel burn rate matches historical baseline for early-season Twin Otter logistical sorties.',
      },
      status: 'Ordered',
      createdAt: '2026-09-18',
      notes: 'Delivery to Novolazarevskaya blue-ice runway fuel dump.',
      supplyContext: {
        currentStock: 12000,
        minimumSafeStock: 6000,
        dailyConsumption: 250,
        daysOfSupply: 24,
        incomingQuantity: 4500,
        expectedDelivery: '18 Oct 2026',
        projectedStockout: '28 Oct 2026',
      },
      procurementData: {
        tenderReference: 'NCPOR/LOG/FUEL/2026/011',
        procurementStage: 'Award Finalized',
        portal: 'NCPOR Portal',
        targetClosingDate: '2026-09-10',
        estimatedBudget: 'INR 14,20,000',
      },
      orderData: {
        orderReference: 'ORD-2026-039',
        supplierName: 'Indian Oil Corporation Ltd. (Aviation Polar Cell)',
        orderDate: '2026-09-15',
        orderStatus: 'Shipment Prepared',
        contractValue: 'INR 13,80,000',
        expectedDispatch: '2026-10-05',
        expectedArrival: '2026-10-18',
      },
      shipmentData: {
        shipmentId: 'ship-101',
        carrierOrVessel: 'DROMLAN Polar Air Corridor',
        transportMode: 'Polar Air Corridor',
        currentStage: 'Cape Town Staging',
        eta: '18 Oct 2026',
        delayStatus: 'On Schedule',
        destination: 'Maitri Station Blue-Ice Runway',
      },
    },
    {
      id: 'req-106',
      sourceType: 'Expedition',
      sourceName: 'Amery Ice Shelf Deep Core Mission',
      expeditionId: 'amery-core',
      raisedBy: 'Rahul Sharma',
      role: 'Expedition Planner',
      itemName: 'Firn Core Thermal Containers',
      category: 'Scientific',
      quantity: 15,
      unit: 'crates',
      requiredWithin: '10 days',
      requiredByDate: '10 Oct 2026',
      urgency: 'HIGH',
      urgencyReason: 'Deep-ice core drilling commences next weather window',
      missionContext: 'Ice shelf traverse camp sub-zero specimen preservation',
      aiForecast: {
        recommendation: 'HIGH',
        recommendedQuantity: 15,
        recommendedRequiredBy: '10 Oct 2026',
        projectedStockoutDays: 7,
        projectedStockoutDate: '07 Oct 2026',
        rationale: 'Sample core preservation will be compromised if thermal insulated crates fail to arrive before coring window.',
      },
      status: 'In Procurement',
      createdAt: '2026-09-25',
      notes: 'Sub-zero insulated crates required to prevent thermal fracturing of delicate ice cores during transit.',
      procurementData: {
        tenderReference: 'NCPOR/LOG/SCI/2026/018',
        procurementStage: 'Published / RFQ',
        portal: 'NCPOR Portal',
        targetClosingDate: '2026-10-04',
        estimatedBudget: 'INR 6,50,000',
      },
    },
    {
      id: 'req-107',
      sourceType: 'Logistics',
      sourceName: 'Cape Town Staging Port',
      raisedBy: 'Ananya Mehta',
      role: 'Logistics Coordinator',
      itemName: 'Sub-Zero Hydraulic Fluid (ISO VG 15)',
      category: 'Equipment',
      quantity: 600,
      unit: 'liters',
      requiredWithin: '30 days',
      requiredByDate: '30 Oct 2026',
      urgency: 'NORMAL',
      urgencyReason: 'Annual continental machinery winterization quota',
      aiForecast: null,
      status: 'In Transit',
      createdAt: '2026-09-21',
      notes: 'Loaded onto MV Polar Queen vessel at Cape Town berth 4.',
      orderData: {
        orderReference: 'ORD-2026-041',
        supplierName: 'TotalEnergies Polar Specialty Fluids',
        orderDate: '2026-09-20',
        orderStatus: 'Dispatched',
        expectedDispatch: '2026-09-25',
        expectedArrival: '2026-10-18',
      },
      shipmentData: {
        shipmentId: 'ship-102',
        carrierOrVessel: 'MV Polar Queen',
        transportMode: 'Maritime Vessel',
        currentStage: 'Ocean Transit',
        eta: '18 Oct 2026',
        delayStatus: 'On Schedule',
        destination: 'Bharati Station Berth',
      },
    },
    {
      id: 'req-108',
      sourceType: 'Station',
      sourceName: 'Himadri Station',
      stationId: 'himadri',
      raisedBy: 'Dr. Sunita Kulkarni',
      role: 'Station Manager',
      itemName: 'Atmospheric Sensor Cartridges',
      category: 'Scientific',
      quantity: 10,
      unit: 'cartridges',
      requiredWithin: '40 days',
      requiredByDate: '08 Nov 2026',
      urgency: 'NORMAL',
      urgencyReason: 'Routine seasonal scientific sensor calibration',
      aiForecast: {
        recommendation: 'NORMAL',
        recommendedQuantity: 10,
        recommendedRequiredBy: '08 Nov 2026',
        projectedStockoutDays: 45,
        projectedStockoutDate: '15 Nov 2026',
        rationale: 'Adequate cartridge reserves active on base; resupply within 40 days is nominal.',
      },
      status: 'Fulfilled',
      createdAt: '2026-09-10',
      notes: 'Delivered and verified in base laboratory.',
      orderData: {
        orderReference: 'ORD-2026-031',
        supplierName: 'Apex Polar Health Systems Ltd.',
        orderDate: '2026-09-08',
        orderStatus: 'Dispatched',
        expectedDispatch: '2026-09-12',
        expectedArrival: '2026-09-24',
      },
    },
  ]);

  // Downstream Tenders
  const [tenders, setTenders] = useState<ProcurementTender[]>([
    {
      id: 'ten-1',
      title: 'Polar Medical Trauma Consignment',
      tenderCode: 'NCPOR/LOG/MED/2026/042',
      portal: 'NCPOR Portal',
      category: 'Medical',
      status: 'Bid Evaluation',
      awardedSupplier: 'Apex Polar Health Systems Ltd.',
      closingDate: '2026-10-04',
      destination: 'Maitri Station & Field Traverses',
      linkedRequirementId: 'req-101',
    },
    {
      id: 'ten-2',
      title: 'Diesel Genset Spares GeM Contract',
      tenderCode: 'GeM/2026/B/882190',
      portal: 'GeM',
      category: 'Spare Parts',
      status: 'Award Finalized',
      awardedSupplier: 'Kirloskar Polar Engineering Division',
      closingDate: '2026-10-02',
      destination: 'Bharati Station',
      linkedRequirementId: 'req-104',
    },
    {
      id: 'ten-3',
      title: 'Firn Core Cryogenic Insulated Packaging',
      tenderCode: 'NCPOR/LOG/SCI/2026/018',
      portal: 'NCPOR Portal',
      category: 'Scientific',
      status: 'Published / RFQ',
      closingDate: '2026-10-04',
      destination: 'Amery Ice Shelf Deep Core Mission',
      linkedRequirementId: 'req-106',
    },
  ]);

  // Downstream Finalized Orders
  const [finalizedOrders, setFinalizedOrders] = useState<FinalizedOrder[]>([
    {
      id: 'ord-1',
      orderName: 'Consolidated Medical Trauma Replenishment',
      itemSummary: 'Field Trauma Kits, Splints & Antiseptics',
      quantity: 45,
      unit: 'kits',
      destinationStation: 'Maitri & Field Traverse',
      awardedSupplier: 'Apex Polar Health Systems Ltd.',
      tenderReference: 'NCPOR/LOG/MED/2026/042',
      orderStatus: 'Shipment Prepared',
      expectedDispatch: '2026-10-08',
      expectedArrival: '2026-10-18',
      linkedRequirementId: 'req-101',
    },
    {
      id: 'ord-2',
      orderName: 'Generator Heavy Spare Parts & Filters',
      itemSummary: 'Cold-Start Filters & Injector Nozzles',
      quantity: 12,
      unit: 'sets',
      destinationStation: 'Bharati Station',
      awardedSupplier: 'Kirloskar Polar Engineering Division',
      tenderReference: 'GeM/2026/B/882190',
      orderStatus: 'Finalized',
      expectedDispatch: '2026-10-02',
      expectedArrival: '2026-10-10',
      linkedRequirementId: 'req-104',
    },
    {
      id: 'ord-3',
      orderName: 'Sub-Zero Aviation Kerosene (ATF-50)',
      itemSummary: '4,500L Aviation Grade Fuel Drum Consignment',
      quantity: 4500,
      unit: 'liters',
      destinationStation: 'Maitri Station Blue-Ice Runway',
      awardedSupplier: 'Indian Oil Corporation Ltd. (Aviation Polar Cell)',
      tenderReference: 'NCPOR/LOG/FUEL/2026/011',
      orderStatus: 'Shipment Prepared',
      expectedDispatch: '2026-10-05',
      expectedArrival: '2026-10-18',
      linkedRequirementId: 'req-105',
    },
  ]);

  // Downstream Shipments
  const [shipments, setShipments] = useState<OngoingShipment[]>([
    {
      id: 'ship-1',
      name: 'Southern Ocean Maritime Resupply #1',
      carrierOrVessel: 'MV Polar Queen',
      transportMode: 'Maritime Vessel',
      destinationStation: 'Bharati Station Berth',
      currentStage: 'Southern Ocean Maritime Transit',
      eta: '18 Oct 2026',
      delayHours: 0,
      status: 'In Transit',
      linkedRequirementId: 'req-107',
    },
    {
      id: 'ship-2',
      name: 'DROMLAN Polar Air Corridor Sortie #3',
      carrierOrVessel: 'DROMLAN Polar Air Corridor (IL-76)',
      transportMode: 'Polar Air Corridor',
      destinationStation: 'Maitri Station Blue-Ice Runway',
      currentStage: 'Cape Town International Airbase',
      eta: '23 Oct 2026',
      delayHours: 48,
      status: 'Delayed in Port',
      linkedRequirementId: 'req-105',
    },
  ]);

  // Sync with server restock requests if available
  useEffect(() => {
    let isMounted = true;
    async function loadServerData() {
      try {
        const serverReqs = await fetchRestockRequests();
        if (isMounted && serverReqs && serverReqs.length > 0) {
          // Merge server restock requests into our requirements pool
          setRequirements((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const newMapped: SupplyRequirement[] = serverReqs
              .filter((sr) => !existingIds.has(sr.id))
              .map((sr) => ({
                id: sr.id,
                sourceType: 'Station',
                sourceName: sr.station?.name || 'Assigned Station',
                stationId: sr.stationId,
                raisedBy: sr.requestedByName || 'Station Manager',
                role: 'Station Manager',
                itemName: sr.item?.itemName || 'Operational Supply',
                category: (sr.item?.category as SupplyCategory) || 'General',
                quantity: sr.requestedQuantity,
                unit: sr.item?.unit || 'units',
                requiredWithin: sr.priority === 'CRITICAL' ? '7 days' : '14 days',
                requiredByDate: '15 Oct 2026',
                urgency: (sr.priority === 'CRITICAL' ? 'CRITICAL' : sr.priority === 'HIGH' ? 'HIGH' : 'NORMAL') as OperationalUrgency,
                urgencyReason: sr.notes || 'Station inventory replenishment',
                status: (sr.status === 'APPROVED'
                  ? 'Approved'
                  : sr.status === 'CARGO_CREATED' || sr.status === 'IN_TRANSIT'
                  ? 'In Transit'
                  : sr.status === 'FULFILLED'
                  ? 'Fulfilled'
                  : sr.status === 'REJECTED'
                  ? 'Rejected'
                  : 'Submitted') as RequirementLifecycleStatus,
                createdAt: sr.createdAt ? sr.createdAt.split('T')[0] : '2026-09-27',
                notes: sr.adminNotes || undefined,
                supplyContext: {
                  currentStock: sr.currentQuantity || 0,
                  minimumSafeStock: sr.minimumQuantity || 10,
                  dailyConsumption: 1,
                  daysOfSupply: Math.max(1, Math.round((sr.currentQuantity || 0) / 1)),
                  incomingQuantity: sr.linkedCargo?.quantity || 0,
                  expectedDelivery: sr.linkedCargo?.eta ? new Date(sr.linkedCargo.eta).toLocaleDateString() : 'Pending Dispatch',
                  projectedStockout: '08 Oct 2026',
                },
                orderReference: sr.linkedCargo?.cargoCode,
              }));
            return [...newMapped, ...prev];
          });
        }
      } catch (err) {
        console.warn('Could not load remote restock requests, continuing with local pool:', err);
      }
    }
    loadServerData();
    return () => {
      isMounted = false;
    };
  }, []);

  // -------------------------------------------------------------
  // 4. RBAC PERMISSIONS (Section 2)
  // -------------------------------------------------------------
  // Station Manager, Expedition Leader, Logistics Commander, Admin can add requirements
  const canAddRequirement = isStationManager || isExpeditionLeader || isLogisticsCommander || isAdmin;

  // Logistics Commander is the operational decision authority for review, consolidation, procurement, and orders
  // Station Manager can view and create requirements for their own station, but cannot approve/reject
  const canApproveOrReject = !isStationManager && (isLogisticsCommander || isAdmin);
  const canConsolidate = !isStationManager && (isLogisticsCommander || isAdmin);
  const canCreateProcurement = !isStationManager && (isLogisticsCommander || isAdmin);
  const canFinalizeOrders = !isStationManager && isLogisticsCommander; // Only Logistics Commander can finalize procurement orders

  // -------------------------------------------------------------
  // 5. SUMMARY INDICATORS (Section 4)
  // -------------------------------------------------------------
  const summaryMetrics = useMemo(() => {
    const openReqs = requirements.filter(
      (r) => r.status !== 'Fulfilled' && r.status !== 'Cancelled' && r.status !== 'Rejected' && r.status !== 'Merged'
    );
    const criticalOrHigh = openReqs.filter((r) => r.urgency === 'CRITICAL' || r.urgency === 'HIGH');
    const underReview = openReqs.filter((r) => r.status === 'Submitted' || r.status === 'Under Review');
    const inProcurement = openReqs.filter((r) => r.status === 'In Procurement');
    const awaitingFulfillment = openReqs.filter(
      (r) => r.status === 'Approved' || r.status === 'Ordered' || r.status === 'In Transit' || r.status === 'Partially Fulfilled'
    );

    return {
      openCount: openReqs.length,
      criticalCount: criticalOrHigh.length,
      underReviewCount: underReview.length,
      inProcurementCount: inProcurement.length,
      awaitingFulfillmentCount: awaitingFulfillment.length,
    };
  }, [requirements]);

  // -------------------------------------------------------------
  // 6. DETECT CONSOLIDATION OPPORTUNITY
  // -------------------------------------------------------------
  // Find items where multiple open requirements share category or similar keyword
  const consolidationCandidateGroups = useMemo(() => {
    const openPool = requirements.filter(
      (r) => (r.status === 'Submitted' || r.status === 'Under Review' || r.status === 'Approved') && !r.isConsolidated
    );

    const groupMap = new Map<string, SupplyRequirement[]>();
    openPool.forEach((req) => {
      // Normalize item keyword
      const key = req.category;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(req);
    });

    const candidateGroups: { category: string; count: number; totalQty: number; unit: string; items: SupplyRequirement[] }[] = [];
    groupMap.forEach((items, cat) => {
      if (items.length > 1) {
        const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
        candidateGroups.push({
          category: cat,
          count: items.length,
          totalQty,
          unit: items[0]?.unit || 'units',
          items,
        });
      }
    });

    return candidateGroups;
  }, [requirements]);

  // -------------------------------------------------------------
  // 6.B ROLE PERSPECTIVE METRICS (Station Manager, Expedition Planner, Commander)
  // -------------------------------------------------------------
  const stationManagerMetrics = useMemo(() => {
    const stationReqs = requirements.filter(
      (r) =>
        r.sourceType === 'Station' &&
        (r.stationId === scope.primaryStationId ||
          r.sourceName.toLowerCase().includes(currentStationName.toLowerCase().split(' ')[0]))
    );
    const lowStockItems = stationReqs.filter(
      (r) => (r.supplyContext && r.supplyContext.currentStock <= r.supplyContext.minimumSafeStock) || r.urgency === 'CRITICAL'
    );
    const requestedItems = stationReqs.filter(
      (r) => r.status === 'Submitted' || r.status === 'Under Review'
    );
    const procuringItems = stationReqs.filter(
      (r) => r.status === 'In Procurement' || (r.procurementData !== undefined && r.status !== 'Fulfilled')
    );
    const enRouteItems = stationReqs.filter(
      (r) => r.status === 'In Transit' || r.status === 'Ordered' || (r.shipmentData !== undefined && r.status !== 'Fulfilled')
    );
    const fulfilledItems = stationReqs.filter(
      (r) => r.status === 'Fulfilled'
    );

    return {
      stationReqs,
      lowStockItems,
      requestedItems,
      procuringItems,
      enRouteItems,
      fulfilledItems,
    };
  }, [requirements, scope.primaryStationId, currentStationName]);

  const expeditionPlannerMetrics = useMemo(() => {
    const expReqs = requirements.filter(
      (r) =>
        r.sourceType === 'Expedition' &&
        (r.expeditionId === scope.primaryExpeditionId ||
          r.sourceName.toLowerCase().includes(currentExpeditionTitle.toLowerCase().split(' ')[0]))
    );
    const criticalReqs = expReqs.filter((r) => r.urgency === 'CRITICAL' || r.urgency === 'HIGH');
    const stagedReqs = expReqs.filter((r) => r.status === 'Ordered' || r.status === 'In Transit' || r.status === 'Fulfilled');
    const pendingProcurement = expReqs.filter((r) => r.status === 'In Procurement' || r.status === 'Under Review');

    return {
      expReqs,
      criticalReqs,
      stagedReqs,
      pendingProcurement,
      readinessPercent: Math.round(((stagedReqs.length + 1) / Math.max(1, expReqs.length + 1)) * 100),
    };
  }, [requirements, scope.primaryExpeditionId, currentExpeditionTitle]);

  const commanderTriageCounts = useMemo(() => {
    const openReqs = requirements.filter(
      (r) => r.status !== 'Fulfilled' && r.status !== 'Cancelled' && r.status !== 'Rejected' && r.status !== 'Merged'
    );
    const needsActionCount = openReqs.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;
    const criticalShortagesCount = openReqs.filter((r) => r.urgency === 'CRITICAL').length;
    const consolidationCandidatesCount = consolidationCandidateGroups.reduce((acc, g) => acc + g.count, 0);
    const inProcurementCount = openReqs.filter((r) => r.status === 'In Procurement' || r.status === 'Approved').length;

    return {
      allCount: openReqs.length,
      needsActionCount,
      criticalShortagesCount,
      consolidationCandidatesCount,
      inProcurementCount,
    };
  }, [requirements, consolidationCandidateGroups]);

  // -------------------------------------------------------------
  // 7. FILTERED & SORTED QUEUE (Section 5)
  // -------------------------------------------------------------
  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      // Role scope filter
      if (isStationManager || scopeFilter === 'my-station') {
        if (req.sourceType !== 'Station') return false;
        const isMatch =
          req.stationId === scope.primaryStationId ||
          req.sourceName.toLowerCase().includes(currentStationName.toLowerCase().split(' ')[0]);
        if (!isMatch) return false;
      } else if (isExpeditionLeader || scopeFilter === 'my-expedition') {
        if (req.sourceType !== 'Expedition') return false;
        const isMatch =
          req.expeditionId === scope.primaryExpeditionId ||
          req.sourceName.toLowerCase().includes(currentExpeditionTitle.toLowerCase().split(' ')[0]);
        if (!isMatch) return false;
      }

      // Commander Triage quick filter (when active and not 'all')
      if (commanderTriageFilter === 'needs-action') {
        if (req.status !== 'Submitted' && req.status !== 'Under Review') return false;
      } else if (commanderTriageFilter === 'critical') {
        if (req.urgency !== 'CRITICAL') return false;
      } else if (commanderTriageFilter === 'consolidation') {
        const candidateCategories = new Set(consolidationCandidateGroups.map((g) => g.category));
        if (!candidateCategories.has(req.category)) return false;
      } else if (commanderTriageFilter === 'procuring') {
        if (req.status !== 'Approved' && req.status !== 'In Procurement') return false;
      }

      // Search Query
      const q = searchQuery.trim().toLowerCase();
      if (q !== '') {
        const matchesQuery =
          req.itemName.toLowerCase().includes(q) ||
          req.sourceName.toLowerCase().includes(q) ||
          req.raisedBy.toLowerCase().includes(q) ||
          req.category.toLowerCase().includes(q) ||
          (req.urgencyReason && req.urgencyReason.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // Source Filter
      if (sourceFilter !== 'All' && req.sourceType !== sourceFilter) return false;

      // Station Dropdown Filter
      if (stationFilter !== 'All') {
        if (!req.sourceName.toLowerCase().includes(stationFilter.toLowerCase())) return false;
      }

      // Priority Filter
      if (priorityFilter !== 'All' && req.urgency !== priorityFilter) return false;

      // Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Active Open') {
          if (req.status === 'Fulfilled' || req.status === 'Cancelled' || req.status === 'Rejected' || req.status === 'Merged') return false;
        } else if (req.status !== statusFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgency') {
        const rank = { CRITICAL: 3, HIGH: 2, NORMAL: 1 };
        return rank[b.urgency] - rank[a.urgency];
      }
      if (sortBy === 'requiredBy') {
        return a.requiredWithin.localeCompare(b.requiredWithin);
      }
      if (sortBy === 'recentlyAdded') {
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (sortBy === 'quantity') {
        return b.quantity - a.quantity;
      }
      return 0;
    });
  }, [requirements, scopeFilter, searchQuery, sourceFilter, stationFilter, priorityFilter, statusFilter, sortBy, commanderTriageFilter, consolidationCandidateGroups, currentUser, expeditions]);

  // -------------------------------------------------------------
  // 8. HANDLERS FOR LIFECYCLE ACTIONS
  // -------------------------------------------------------------

  const handleApprove = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r))
    );
    if (inspectingRequirement && inspectingRequirement.id === id) {
      setInspectingRequirement({ ...inspectingRequirement, status: 'Approved' });
    }
    // Update backend asynchronously
    updateRestockRequest(id, { status: 'APPROVED' }).catch(() => {});
  };

  const handleReject = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Rejected' } : r))
    );
    if (inspectingRequirement && inspectingRequirement.id === id) {
      setInspectingRequirement({ ...inspectingRequirement, status: 'Rejected' });
    }
    updateRestockRequest(id, { status: 'REJECTED' }).catch(() => {});
  };

  const handleOpenClarification = (req: SupplyRequirement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetReqForAction(req);
    setClarificationText(req.clarificationNotes || '');
    setIsClarificationModalOpen(true);
  };

  const handleSaveClarification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReqForAction) return;
    setRequirements((prev) =>
      prev.map((r) =>
        r.id === targetReqForAction.id
          ? {
              ...r,
              clarificationNotes: clarificationText.trim(),
              status: 'Under Review',
            }
          : r
      )
    );
    if (inspectingRequirement && inspectingRequirement.id === targetReqForAction.id) {
      setInspectingRequirement({
        ...inspectingRequirement,
        clarificationNotes: clarificationText.trim(),
        status: 'Under Review',
      });
    }
    setIsClarificationModalOpen(false);
  };

  // Add Requirement Form Submit
  const handleAddRequirementSubmit = async (isDraft = false) => {
    if (!newReqItem.trim()) return;

    const requesterName =
      currentUser?.name ||
      (isStationManager
        ? 'Dr. Rajesh Nair'
        : isExpeditionLeader
        ? 'Dr. Anita Singh'
        : isLogisticsCommander
        ? 'Cmdr. Vikram Malhotra'
        : 'Operations Officer');

    const requesterRole = isStationManager
      ? 'Station Manager'
      : isExpeditionLeader
      ? 'Expedition Planner'
      : isLogisticsCommander
      ? 'Logistics Commander'
      : 'Operations Officer';

    const targetStationId = newReqType === 'Station'
      ? (currentStation?.id || scope.primaryStationId || undefined)
      : undefined;

    const targetExpeditionId = newReqType === 'Expedition'
      ? (currentExpedition?.id || scope.primaryExpeditionId || undefined)
      : undefined;

    const newReq: SupplyRequirement = {
      id: `req-${Date.now().toString().slice(-4)}`,
      sourceType: newReqType,
      sourceName: newReqTarget,
      stationId: targetStationId,
      expeditionId: targetExpeditionId,
      raisedBy: requesterName,
      role: requesterRole,
      itemName: newReqItem.trim(),
      category: newReqCategory,
      quantity: Number(newReqQty) || 1,
      unit: newReqUnit,
      requiredWithin: newReqRequiredWithin,
      requiredByDate: '15 Oct 2026',
      urgency: newReqUrgency,
      urgencyReason: newReqReason.trim() || (newReqUrgency === 'CRITICAL' ? 'Urgent shortage buffer deficit' : 'Standard seasonal replenishment'),
      missionContext: newReqType === 'Station' ? `${newReqTarget} base operations` : `${newReqTarget} field mission`,
      aiForecast: {
        recommendation: newReqUrgency,
        recommendedQuantity: Math.round(Number(newReqQty) * 1.15),
        recommendedRequiredBy: newReqRequiredWithin,
        projectedStockoutDays: newReqUrgency === 'CRITICAL' ? 5 : 12,
        projectedStockoutDate: '10 Oct 2026',
        rationale: `AI Analysis: Inventory burn rate indicates stock depletion occurs prior to next scheduled transport sortie. Recommend +15% safety buffer.`,
      },
      status: isDraft ? 'Draft' : 'Submitted',
      createdAt: new Date().toISOString().split('T')[0],
      notes: newReqNotes.trim() || undefined,
      supplyContext: {
        currentStock: 5,
        minimumSafeStock: 15,
        dailyConsumption: 1.2,
        daysOfSupply: 4,
        incomingQuantity: 0,
        expectedDelivery: 'Pending Procurement',
        projectedStockout: '10 Oct 2026',
      },
    };

    try {
      const created = await createOperationalRequirement({
        stationId: targetStationId,
        expeditionId: targetExpeditionId,
        itemName: newReqItem.trim(),
        category: newReqCategory,
        requestedQuantity: Number(newReqQty) || 1,
        unit: newReqUnit,
        priority: newReqUrgency,
        notes: newReqReason.trim() || newReqNotes.trim() || undefined,
      });
      if (created?.id) {
        newReq.id = created.id;
        if (created.stationId) newReq.stationId = created.stationId;
      }
    } catch (err) {
      console.warn('Could not persist to backend restock-requests, continuing with local pool:', err);
    }

    setRequirements((prev) => [newReq, ...prev]);
    setIsAddModalOpen(false);
    setNewReqItem('');
    setNewReqReason('');
    setNewReqNotes('');
    triggerRefresh();
  };

  // Open Consolidation Modal with pre-selected requirements
  const handleOpenConsolidationModal = (itemsToConsolidate: SupplyRequirement[]) => {
    const ids = new Set(itemsToConsolidate.map((i) => i.id));
    setSelectedReqIds(ids);
    const sampleCategory = itemsToConsolidate[0]?.category || 'Medical';
    setConsolidationTitle(`Consolidated ${sampleCategory} Consignment`);
    setConsolidationNotes(`Merged ${itemsToConsolidate.length} operational requirements across ${Array.from(new Set(itemsToConsolidate.map((i) => i.sourceName))).join(', ')}.`);
    setIsConsolidateModalOpen(true);
  };

  // Execute Consolidation (Section 8)
  const handleConfirmConsolidation = () => {
    const selectedList = requirements.filter((r) => selectedReqIds.has(r.id));
    if (selectedList.length < 2) return;

    const consolidatedId = `req-cons-${Date.now().toString().slice(-4)}`;
    const combinedQty = selectedList.reduce((acc, cur) => acc + cur.quantity, 0);
    const primaryUnit = selectedList[0].unit;
    const category = selectedList[0].category;

    // AI recommended buffer
    const aiQty = Math.round(combinedQty * 1.1);

    // Highest urgency
    const hasCritical = selectedList.some((r) => r.urgency === 'CRITICAL');
    const hasHigh = selectedList.some((r) => r.urgency === 'HIGH');
    const urgency: OperationalUrgency = hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'NORMAL';

    const consolidatedReq: SupplyRequirement = {
      id: consolidatedId,
      sourceType: 'Logistics',
      sourceName: `Multi-Source Consolidated (${selectedList.map((r) => r.sourceName).join(', ')})`,
      raisedBy: currentUser?.name || 'Cmdr. Vikram Malhotra',
      role: 'Logistics Commander',
      itemName: consolidationTitle,
      category,
      quantity: combinedQty,
      unit: primaryUnit,
      requiredWithin: selectedList[0].requiredWithin,
      requiredByDate: '12 Oct 2026',
      urgency,
      urgencyReason: `Consolidated procurement of ${selectedList.length} related requirements to optimize tender economics and polar freight slots.`,
      missionContext: `Combined dispatch covering ${selectedList.map((r) => r.sourceName).join(' + ')}`,
      aiForecast: {
        recommendation: urgency,
        recommendedQuantity: aiQty,
        recommendedRequiredBy: '12 Oct 2026',
        projectedStockoutDays: 7,
        projectedStockoutDate: '09 Oct 2026',
        rationale: `AI Supply Model: Combining ${selectedList.length} requisitions saves ~35% air freight slot overhead and secures priority vendor production batch.`,
      },
      status: 'Approved',
      createdAt: new Date().toISOString().split('T')[0],
      notes: consolidationNotes,
      isConsolidated: true,
      mergedRequirementIds: selectedList.map((r) => r.id),
      supplyContext: {
        currentStock: selectedList.reduce((acc, r) => acc + (r.supplyContext?.currentStock || 0), 0),
        minimumSafeStock: selectedList.reduce((acc, r) => acc + (r.supplyContext?.minimumSafeStock || 0), 0),
        dailyConsumption: 2.5,
        daysOfSupply: 3.5,
        incomingQuantity: 0,
        expectedDelivery: 'Ready for Procurement',
        projectedStockout: '09 Oct 2026',
      },
    };

    // Mark original requirements as 'Merged' with link
    const updated = requirements.map((r) => {
      if (selectedReqIds.has(r.id)) {
        return {
          ...r,
          status: 'Merged' as RequirementLifecycleStatus,
          mergedIntoId: consolidatedId,
        };
      }
      return r;
    });

    setRequirements([consolidatedReq, ...updated]);
    setSelectedReqIds(new Set());
    setIsConsolidateModalOpen(false);

    // If inspecting one of the merged items, switch to the new consolidated requirement
    setInspectingRequirement(consolidatedReq);
  };

  // Open Procurement Request Modal
  const handleOpenProcurement = (req: SupplyRequirement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetReqForAction(req);
    setTenderRefInput(`NCPOR/LOG/${req.category.toUpperCase().slice(0, 3)}/2026/0${Math.floor(Math.random() * 80 + 20)}`);
    setIsProcurementModalOpen(true);
  };

  const handleConfirmProcurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReqForAction) return;

    const procurementInfo = {
      tenderReference: tenderRefInput.trim(),
      procurementStage: 'Published / RFQ' as const,
      portal: tenderPortal,
      targetClosingDate: tenderTargetDate,
      estimatedBudget: tenderEstimatedBudget,
    };

    setRequirements((prev) =>
      prev.map((r) =>
        r.id === targetReqForAction.id
          ? {
              ...r,
              status: 'In Procurement',
              procurementData: procurementInfo,
            }
          : r
      )
    );

    // Also add to tenders list
    setTenders((prev) => [
      {
        id: `ten-${Date.now().toString().slice(-4)}`,
        title: `${targetReqForAction.itemName} Supply Tender`,
        tenderCode: tenderRefInput.trim(),
        portal: tenderPortal,
        category: targetReqForAction.category,
        status: 'Published / RFQ',
        closingDate: tenderTargetDate,
        destination: targetReqForAction.sourceName,
        linkedRequirementId: targetReqForAction.id,
      },
      ...prev,
    ]);

    if (inspectingRequirement && inspectingRequirement.id === targetReqForAction.id) {
      setInspectingRequirement({
        ...inspectingRequirement,
        status: 'In Procurement',
        procurementData: procurementInfo,
      });
    }

    setIsProcurementModalOpen(false);
  };

  // Open Finalize Order Modal
  const handleOpenFinalizeOrder = (req: SupplyRequirement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetReqForAction(req);
    setOrderRefInput(`ORD-2026-0${Math.floor(Math.random() * 80 + 30)}`);
    setIsFinalizeOrderModalOpen(true);
  };

  const handleConfirmFinalizeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReqForAction) return;

    const orderInfo = {
      orderReference: orderRefInput.trim(),
      supplierName: orderSupplier,
      orderDate: new Date().toISOString().split('T')[0],
      orderStatus: 'Finalized' as const,
      expectedDispatch: orderDispatchDate,
      expectedArrival: orderArrivalDate,
    };

    setRequirements((prev) =>
      prev.map((r) =>
        r.id === targetReqForAction.id
          ? {
              ...r,
              status: 'Ordered',
              orderData: orderInfo,
            }
          : r
      )
    );

    // Add to finalized orders list
    setFinalizedOrders((prev) => [
      {
        id: `ord-${Date.now().toString().slice(-4)}`,
        orderName: `${targetReqForAction.itemName} Delivery Contract`,
        itemSummary: `${targetReqForAction.quantity} ${targetReqForAction.unit} ${targetReqForAction.itemName}`,
        quantity: targetReqForAction.quantity,
        unit: targetReqForAction.unit,
        destinationStation: targetReqForAction.sourceName,
        awardedSupplier: orderSupplier,
        tenderReference: targetReqForAction.procurementData?.tenderReference || 'GeM/2026/POLAR/09',
        orderStatus: 'Finalized',
        expectedDispatch: orderDispatchDate,
        expectedArrival: orderArrivalDate,
        linkedRequirementId: targetReqForAction.id,
      },
      ...prev,
    ]);

    if (inspectingRequirement && inspectingRequirement.id === targetReqForAction.id) {
      setInspectingRequirement({
        ...inspectingRequirement,
        status: 'Ordered',
        orderData: orderInfo,
      });
    }

    setIsFinalizeOrderModalOpen(false);
  };

  // Open Dispatch Shipment Modal
  const handleOpenDispatchShipment = (req: SupplyRequirement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetReqForAction(req);
    setIsDispatchModalOpen(true);
  };

  const handleConfirmDispatchShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReqForAction) return;

    const shipInfo = {
      shipmentId: `ship-${Date.now().toString().slice(-4)}`,
      carrierOrVessel: shipmentCarrier,
      transportMode: shipmentMode,
      currentStage: shipmentStage,
      eta: shipmentEta,
      delayStatus: 'On Schedule' as const,
      destination: targetReqForAction.sourceName,
    };

    setRequirements((prev) =>
      prev.map((r) =>
        r.id === targetReqForAction.id
          ? {
              ...r,
              status: 'In Transit',
              shipmentData: shipInfo,
            }
          : r
      )
    );

    setShipments((prev) => [
      {
        id: shipInfo.shipmentId,
        name: `${targetReqForAction.itemName} Transport Consignment`,
        carrierOrVessel: shipmentCarrier,
        transportMode: shipmentMode,
        destinationStation: targetReqForAction.sourceName,
        currentStage: shipmentStage,
        eta: shipmentEta,
        delayHours: 0,
        status: 'In Transit',
        linkedRequirementId: targetReqForAction.id,
      },
      ...prev,
    ]);

    if (inspectingRequirement && inspectingRequirement.id === targetReqForAction.id) {
      setInspectingRequirement({
        ...inspectingRequirement,
        status: 'In Transit',
        shipmentData: shipInfo,
      });
    }

    setIsDispatchModalOpen(false);
  };

  const handleMarkFulfilled = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Fulfilled' } : r))
    );
    if (inspectingRequirement && inspectingRequirement.id === id) {
      setInspectingRequirement({ ...inspectingRequirement, status: 'Fulfilled' });
    }
    updateRestockRequest(id, { status: 'FULFILLED' }).catch(() => {});
  };

  // Row selection toggle for bulk consolidation
  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedReqIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedReqIds(next);
  };

  // Find related requirements for an item
  const getRelatedRequirements = (item: SupplyRequirement) => {
    return requirements.filter(
      (r) => r.id !== item.id && (r.category === item.category || r.itemName.toLowerCase().includes(item.itemName.toLowerCase().slice(0, 5))) && r.status !== 'Merged' && r.status !== 'Fulfilled'
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-20 select-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. PAGE HEADER (Section 4)                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#0284C7] uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4" />
            <span>Operational Coordination</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Supply & Logistics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-2xl">
            Review and coordinate operational supply requirements raised by stations and expedition teams.
          </p>
        </div>

        {/* Top-Right Action: Add Requirement */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto">
          {canAddRequirement && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition flex items-center space-x-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Requirement</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUMMARY INDICATORS (Section 4: Compact & Informative)     */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Open Requirements */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Open Pool
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summaryMetrics.openCount}</div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">Active operational requisitions</div>
        </div>

        {/* Critical / High Priority */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Critical / High</span>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{summaryMetrics.criticalCount}</div>
          <div className="text-[11px] text-rose-600/80 font-normal mt-0.5">Immediate stockout risk</div>
        </div>

        {/* Under Review */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Under Review</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{summaryMetrics.underReviewCount}</div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">Awaiting command approval</div>
        </div>

        {/* In Procurement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider flex items-center space-x-1">
            <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
            <span>In Procurement</span>
          </div>
          <div className="text-2xl font-bold text-sky-700 mt-1">{summaryMetrics.inProcurementCount}</div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">Tenders & RFQs in progress</div>
        </div>

        {/* Awaiting Fulfillment */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center space-x-1">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Awaiting Delivery</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{summaryMetrics.awaitingFulfillmentCount}</div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">Ordered or en route</div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. DOWNSTREAM WORKFLOW NAVIGATION TABS                         */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto scrollbar-none pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('requirements')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'requirements'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Requirements Pool</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {requirements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('procurement')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'procurement'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Procurement & Tenders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {tenders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finalized')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'finalized'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Finalized Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {finalizedOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tracking')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'tracking'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Shipment Tracking</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {shipments.length}
          </span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. CONSOLIDATION OPPORTUNITY BANNER (Section 8)               */}
      {/* ------------------------------------------------------------- */}
      {canConsolidate && consolidationCandidateGroups.length > 0 && activeTab === 'requirements' && (
        <div className="bg-sky-50/90 border border-sky-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-[#0284C7] shrink-0 mt-0.5">
                <Merge className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-sky-900">
                    Consolidation Opportunities Detected
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-sky-200/80 text-sky-800">
                    Decision Support
                  </span>
                </div>
                <p className="text-xs text-sky-800/90 font-normal mt-0.5 leading-relaxed">
                  Multiple requirements for similar supplies across stations and expeditions can be merged for tender efficiency:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {consolidationCandidateGroups.map((group) => (
              <div
                key={group.category}
                className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900">{group.category} Consignment</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                    {group.count} requests • Total: <strong>{group.totalQty} {group.unit}</strong>
                  </div>
                  <div className="text-[10px] text-sky-700 font-medium">
                    {group.items.map((i) => i.sourceName.split(' ')[0]).join(' + ')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenConsolidationModal(group.items)}
                  className="px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-[11px] font-semibold transition cursor-pointer shrink-0 shadow-2xs"
                >
                  Consolidate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TAB 1: COMMON REQUIREMENTS POOL (Main Queue)               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'requirements' && (
        <div className="space-y-4">
          {/* Quick Scoping & Role Specific Perspective Switcher (Hidden for Station Manager as scope is locked by RBAC) */}
          {!isStationManager && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              {/* Scoping perspective */}
              {isExpeditionLeader ? (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Scope:</span>
                  <span className="px-3 py-1.5 rounded-xl bg-[#0284C7] text-white font-semibold text-xs flex items-center space-x-1.5 shadow-2xs">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Expedition Planner Scope ({currentExpeditionTitle})</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold mr-1">Perspective:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFilter('all');
                      setCommanderTriageFilter('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-xs ${
                      scopeFilter === 'all'
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    All Polar Operations
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeFilter('my-station')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-xs flex items-center space-x-1.5 ${
                      scopeFilter === 'my-station'
                        ? 'bg-[#0284C7] text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Station View ({currentStationName})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeFilter('my-expedition')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-xs flex items-center space-x-1.5 ${
                      scopeFilter === 'my-expedition'
                        ? 'bg-[#0284C7] text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Expedition View ({currentExpeditionTitle})</span>
                  </button>
                </div>
              )}

              {/* Bulk Actions for Logistics Commander */}
              {canConsolidate && selectedReqIds.size > 0 && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500 font-medium">
                    {selectedReqIds.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const sel = requirements.filter((r) => selectedReqIds.has(r.id));
                      handleOpenConsolidationModal(sel);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  >
                    <Merge className="w-3.5 h-3.5" />
                    <span>Consolidate Selected ({selectedReqIds.size})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReqIds(new Set())}
                    className="px-2 py-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DEDICATED STATION MANAGER PERSPECTIVE (Answers the 5 Operational Questions) */}
          {scopeFilter === 'my-station' && (
            <div className="bg-white rounded-2xl border border-sky-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#0284C7] flex items-center justify-center font-bold">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-sm font-bold text-slate-900">{currentStationName} — Operational Supply Status</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200">
                        Station Manager Perspective
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-normal">
                      Real-time answers to the 5 critical station inventory and requisition questions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewReqType('Station');
                    setNewReqTarget(currentStationName);
                    setIsAddModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Station Requisition</span>
                </button>
              </div>

              {/* 5 Questions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. What is low? */}
                <div
                  onClick={() => {
                    setPriorityFilter('CRITICAL');
                    setStatusFilter('All');
                  }}
                  className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50/60 transition cursor-pointer group"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
                    <span>1. What is low?</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-lg font-extrabold text-rose-700 mt-1">
                    {stationManagerMetrics.lowStockItems.length} Shortage{stationManagerMetrics.lowStockItems.length !== 1 ? 's' : ''}
                  </div>
                  <p className="text-[11px] text-slate-600 font-normal mt-0.5 line-clamp-2">
                    {stationManagerMetrics.lowStockItems.length > 0
                      ? stationManagerMetrics.lowStockItems.map((i) => `${i.itemName} (${i.supplyContext?.currentStock || 0}/${i.supplyContext?.minimumSafeStock || 0})`).join(', ')
                      : 'All station inventory buffers nominal.'}
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-rose-700 group-hover:underline flex items-center space-x-1">
                    <span>Filter critical stockouts</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                {/* 2. What have I requested? */}
                <div
                  onClick={() => {
                    setStatusFilter('Under Review');
                    setPriorityFilter('All');
                  }}
                  className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 transition cursor-pointer group"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
                    <span>2. What have I requested?</span>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-lg font-extrabold text-amber-700 mt-1">
                    {stationManagerMetrics.requestedItems.length} In Review
                  </div>
                  <p className="text-[11px] text-slate-600 font-normal mt-0.5 line-clamp-2">
                    {stationManagerMetrics.requestedItems.length > 0
                      ? stationManagerMetrics.requestedItems.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')
                      : 'No pending requests under review.'}
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-amber-700 group-hover:underline flex items-center space-x-1">
                    <span>View requested items</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                {/* 3. What is being procured? */}
                <div
                  onClick={() => {
                    setStatusFilter('In Procurement');
                    setPriorityFilter('All');
                  }}
                  className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/30 hover:bg-sky-50/60 transition cursor-pointer group"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 flex items-center justify-between">
                    <span>3. What is being procured?</span>
                    <Tag className="w-3.5 h-3.5 text-[#0284C7]" />
                  </div>
                  <div className="text-lg font-extrabold text-sky-700 mt-1">
                    {stationManagerMetrics.procuringItems.length} Tender{stationManagerMetrics.procuringItems.length !== 1 ? 's' : ''}
                  </div>
                  <p className="text-[11px] text-slate-600 font-normal mt-0.5 line-clamp-2">
                    {stationManagerMetrics.procuringItems.length > 0
                      ? stationManagerMetrics.procuringItems.map((i) => i.itemName).join(', ')
                      : 'GeM & NCPOR RFQ bids in evaluation.'}
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-sky-700 group-hover:underline flex items-center space-x-1">
                    <span>View procurement items</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                {/* 4. What is already coming? */}
                <div
                  onClick={() => {
                    setActiveTab('tracking');
                  }}
                  className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/60 transition cursor-pointer group"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-between">
                    <span>4. What is already coming?</span>
                    <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-lg font-extrabold text-indigo-700 mt-1">
                    {stationManagerMetrics.enRouteItems.length} In Transit
                  </div>
                  <p className="text-[11px] text-slate-600 font-normal mt-0.5 line-clamp-2">
                    {stationManagerMetrics.enRouteItems.length > 0
                      ? stationManagerMetrics.enRouteItems.map((i) => `${i.itemName} (ETA ${i.shipmentData?.eta || i.supplyContext?.expectedDelivery || 'Oct'})`).join(', ')
                      : 'DROMLAN Flight #3 & MV Polar Queen.'}
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-indigo-700 group-hover:underline flex items-center space-x-1">
                    <span>Jump to shipment tracking</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                {/* 5. What has arrived? */}
                <div
                  onClick={() => {
                    setStatusFilter('Fulfilled');
                    setPriorityFilter('All');
                  }}
                  className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60 transition cursor-pointer group"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                    <span>5. What has arrived?</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 mt-1">
                    {stationManagerMetrics.fulfilledItems.length} Restocked
                  </div>
                  <p className="text-[11px] text-slate-600 font-normal mt-0.5 line-clamp-2">
                    {stationManagerMetrics.fulfilledItems.length > 0
                      ? stationManagerMetrics.fulfilledItems.map((i) => i.itemName).join(', ')
                      : 'Recently delivered and received at station.'}
                  </p>
                  <div className="mt-2 text-[10px] font-semibold text-emerald-700 group-hover:underline flex items-center space-x-1">
                    <span>View fulfilled items</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED EXPEDITION PLANNER PERSPECTIVE (Mission Readiness & Staging Checks) */}
          {scopeFilter === 'my-expedition' && (
            <div className="bg-white rounded-2xl border border-indigo-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Compass className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        {expeditions[0]?.title || 'Amery Ice Shelf Deep Core Mission'} — Expedition Supply Readiness
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Expedition Planner Perspective
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-normal">
                      Traverse logistics coordination, staging verification, and departure supply checks.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewReqType('Expedition');
                    setNewReqTarget(expeditions[0]?.title || 'Amery Ice Shelf Deep Core Mission');
                    setIsAddModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Expedition Request</span>
                </button>
              </div>

              {/* Expedition Key Readiness Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Field Readiness Progress */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Traverse Readiness</span>
                    <span className="text-emerald-700 font-bold">{expeditionPlannerMetrics.readinessPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${expeditionPlannerMetrics.readinessPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-600 font-normal">
                    Departure window opens in <strong>18 days</strong> (15 Nov 2026).
                  </div>
                </div>

                {/* Field Requisitions Needed */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
                    <span>Mission Requisitions</span>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-lg font-extrabold text-amber-700">
                    {expeditionPlannerMetrics.expReqs.length} Total Needed
                  </div>
                  <div className="text-[11px] text-slate-600 font-normal">
                    {expeditionPlannerMetrics.criticalReqs.length} Critical for ice drilling start.
                  </div>
                </div>

                {/* Staged at Base Runway */}
                <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/30 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 flex items-center justify-between">
                    <span>Staged at Runway</span>
                    <Boxes className="w-3.5 h-3.5 text-[#0284C7]" />
                  </div>
                  <div className="text-lg font-extrabold text-sky-700">
                    12 Crates Verified
                  </div>
                  <div className="text-[11px] text-slate-600 font-normal">
                    Maitri Blue-Ice Runway Staging Pad.
                  </div>
                </div>

                {/* Transport Sorties */}
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-between">
                    <span>Next Air / Sledge Sortie</span>
                    <Plane className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-lg font-extrabold text-indigo-700">
                    DROMLAN #3
                  </div>
                  <div className="text-[11px] text-slate-600 font-normal">
                    ETA 23 Oct 2026 • Cryogenic insulated cargo.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LOGISTICS COMMANDER TRIAGE QUICK-BAR */}
          {scopeFilter === 'all' && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/90 text-xs">
              <span className="text-[11px] text-slate-400 uppercase font-semibold mr-1 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Commander Triage:</span>
              </span>

              <button
                type="button"
                onClick={() => setCommanderTriageFilter('all')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs font-semibold ${
                  commanderTriageFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                All Active Pool ({commanderTriageCounts.allCount})
              </button>

              <button
                type="button"
                onClick={() => setCommanderTriageFilter('needs-action')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs font-semibold flex items-center space-x-1.5 ${
                  commanderTriageFilter === 'needs-action'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Needs Commander Action ({commanderTriageCounts.needsActionCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setCommanderTriageFilter('critical')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs font-semibold flex items-center space-x-1.5 ${
                  commanderTriageFilter === 'critical'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Critical Stockouts ({commanderTriageCounts.criticalShortagesCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setCommanderTriageFilter('consolidation')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs font-semibold flex items-center space-x-1.5 ${
                  commanderTriageFilter === 'consolidation'
                    ? 'bg-[#0284C7] text-white shadow-2xs'
                    : 'bg-white hover:bg-sky-50 text-sky-800 border border-sky-200'
                }`}
              >
                <Merge className="w-3 h-3" />
                <span>Consolidation Opportunities ({consolidationCandidateGroups.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCommanderTriageFilter('procuring')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs font-semibold flex items-center space-x-1.5 ${
                  commanderTriageFilter === 'procuring'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200'
                }`}
              >
                <Tag className="w-3 h-3" />
                <span>In Procurement ({commanderTriageCounts.inProcurementCount})</span>
              </button>
            </div>
          )}

          {/* Search & Multifaceted Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search requirements, items, stations or expeditions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
                />
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center space-x-2 text-xs shrink-0">
                <span className="text-slate-400 font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="urgency">Urgency (Critical First)</option>
                  <option value="requiredBy">Required-by Date</option>
                  <option value="recentlyAdded">Recently Submitted</option>
                  <option value="quantity">Requested Quantity</option>
                </select>
              </div>
            </div>

            {/* Quick Filter Selectors */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              {/* Source */}
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-400 uppercase font-medium mr-1">Source:</span>
                {(['All', 'Station', 'Expedition'] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSourceFilter(src)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                      sourceFilter === src
                        ? 'bg-[#0284C7] text-white font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Priority */}
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-400 uppercase font-medium mr-1">Priority:</span>
                {(['All', 'CRITICAL', 'HIGH', 'NORMAL'] as const).map((pri) => (
                  <button
                    key={pri}
                    type="button"
                    onClick={() => setPriorityFilter(pri)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                      priorityFilter === pri
                        ? pri === 'CRITICAL'
                          ? 'bg-rose-600 text-white font-semibold'
                          : pri === 'HIGH'
                          ? 'bg-amber-600 text-white font-semibold'
                          : 'bg-slate-700 text-white font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium'
                    }`}
                  >
                    {pri}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              {/* Status */}
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-400 uppercase font-medium mr-1">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active Open">All Active Open</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="In Procurement">In Procurement</option>
                  <option value="Ordered">Ordered</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="Merged">Merged</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requirement Queue Items (Clean Operational Rows/Cards) */}
          {filteredRequirements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 shadow-2xs">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800">No Requirements Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-normal">
                No operational supply requirements match your active filter and search criteria.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSourceFilter('All');
                  setStationFilter('All');
                  setPriorityFilter('All');
                  setStatusFilter('All');
                  setScopeFilter('all');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequirements.map((req) => {
                const isCritical = req.urgency === 'CRITICAL';
                const isHigh = req.urgency === 'HIGH';
                const isSelected = selectedReqIds.has(req.id);
                const relatedItems = getRelatedRequirements(req);

                return (
                  <div
                    key={req.id}
                    onClick={() => setInspectingRequirement(req)}
                    className={`bg-white rounded-2xl border transition p-4 sm:p-5 cursor-pointer shadow-2xs hover:shadow-md ${
                      isSelected
                        ? 'border-sky-400 ring-2 ring-sky-100 bg-sky-50/20'
                        : isCritical
                        ? 'border-rose-200 hover:border-rose-300'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Checkbox + Primary Info */}
                      <div className="flex items-start space-x-3.5 flex-1">
                        {canConsolidate && (
                          <div
                            onClick={(e) => toggleSelectRow(req.id, e)}
                            className="pt-1 text-slate-400 hover:text-[#0284C7] cursor-pointer"
                            title="Select for consolidation"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#0284C7]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </div>
                        )}

                        <div className="space-y-1.5 flex-1">
                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Urgency Badge */}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-800'
                                  : isHigh
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {req.urgency}
                            </span>

                            {/* Category Badge */}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {req.category}
                            </span>

                            {/* Source location */}
                            <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
                              {req.sourceType === 'Station' ? (
                                <Building2 className="w-3.5 h-3.5 text-[#0284C7]" />
                              ) : (
                                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                              <span>{req.sourceName}</span>
                            </span>

                            <span className="text-slate-300">•</span>

                            <span className="text-xs text-slate-500 font-normal">
                              Required by <strong className="text-slate-700">{req.requiredByDate}</strong> ({req.requiredWithin})
                            </span>
                          </div>

                          {/* Item Title & Quantity */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">
                              {req.itemName}
                            </h3>
                            <span className="text-xs font-mono font-bold text-slate-700 px-2 py-0.5 rounded bg-slate-100">
                              {req.quantity.toLocaleString()} {req.unit}
                            </span>
                            {req.isConsolidated && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Consolidated Requisition
                              </span>
                            )}
                          </div>

                          {/* Raised By Identity Callout */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-normal">
                            <span>Raised by:</span>
                            <strong className="text-slate-800 font-semibold">{req.raisedBy}</strong>
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {req.role}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span>Context:</span>
                            <strong className="text-slate-800 font-semibold">{req.sourceName}</strong>
                          </div>

                          {/* Reason / Requester Context */}
                          {req.urgencyReason && (
                            <p className="text-xs text-slate-600 font-normal line-clamp-1">
                              {req.urgencyReason}
                            </p>
                          )}

                          {/* AI Recommendation Indicator */}
                          {req.aiForecast && (
                            <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                              <div className="flex items-center space-x-1 text-[#0284C7] font-semibold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                                <Sparkles className="w-3 h-3 text-[#0284C7]" />
                                <span>AI Forecast: Stockout in {req.aiForecast.projectedStockoutDays}d</span>
                              </div>
                              <span className="text-slate-500 font-normal">
                                Rec: <strong>{req.aiForecast.recommendedQuantity} {req.unit}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Status Badge & Workflow Progression Action */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                        {/* Status Badge */}
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${
                            req.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : req.status === 'In Procurement'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : req.status === 'Ordered'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : req.status === 'In Transit'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : req.status === 'Fulfilled'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : req.status === 'Merged'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : req.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {req.status}
                        </span>

                        {/* Primary Row Actions */}
                        <div className="flex items-center space-x-2">
                          {/* Commander Quick Approve/Reject on Pending Items */}
                          {canApproveOrReject && (req.status === 'Submitted' || req.status === 'Under Review') && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleReject(req.id, e)}
                                title="Reject"
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleApprove(req.id, e)}
                                title="Approve"
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer flex items-center space-x-1 shadow-2xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            </>
                          )}

                          {/* Create Procurement for Approved Requirements */}
                          {canCreateProcurement && req.status === 'Approved' && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenProcurement(req, e)}
                              className="px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition cursor-pointer flex items-center space-x-1 shadow-2xs"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              <span>Create Procurement</span>
                            </button>
                          )}

                          {/* Review Details Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingRequirement(req);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
                          >
                            <span>Review</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TAB 2: PROCUREMENT & TENDERS                               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'procurement' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Procurement Requests & Tenders</h2>
              <p className="text-xs text-slate-500 font-normal">
                Approved requirements undergoing formal quotation and portal bidding (GeM / NCPOR).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenders.map((tender) => (
              <div key={tender.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                      {tender.portal}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-2">{tender.title}</h3>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">{tender.tenderCode}</div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {tender.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Destination:</span>
                    <span className="font-medium text-slate-800">{tender.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Closing Date:</span>
                    <span className="font-semibold text-slate-800">{tender.closingDate}</span>
                  </div>
                  {tender.awardedSupplier && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Awarded To:</span>
                      <span className="font-semibold text-emerald-700">{tender.awardedSupplier}</span>
                    </div>
                  )}
                </div>

                {canFinalizeOrders && tender.status === 'Bid Evaluation' && (
                  <button
                    type="button"
                    onClick={() => {
                      const linked = requirements.find((r) => r.id === tender.linkedRequirementId) || requirements[0];
                      handleOpenFinalizeOrder(linked);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-2xs"
                  >
                    Finalize Order Contract
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. TAB 3: FINALIZED ORDERS                                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'finalized' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Finalized Purchase Orders</h2>
              <p className="text-xs text-slate-500 font-normal">
                Awarded vendor contracts ready for staging at Cape Town logistics depots or dispatched to base.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {finalizedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded">
                      {order.tenderReference}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Destination: {order.destinationStation}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{order.orderName}</h3>
                  <div className="text-xs text-slate-600 font-normal">
                    Items: <strong className="text-slate-800">{order.itemSummary}</strong> • Supplier:{' '}
                    <strong className="text-emerald-700">{order.awardedSupplier}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dispatch: {order.expectedDispatch} • Expected Base Arrival: {order.expectedArrival}
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start md:self-auto">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {order.orderStatus}
                  </span>
                  {isLogisticsCommander && order.orderStatus === 'Finalized' && (
                    <button
                      type="button"
                      onClick={() => {
                        const linked = requirements.find((r) => r.id === order.linkedRequirementId) || requirements[0];
                        handleOpenDispatchShipment(linked);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer transition shadow-2xs"
                    >
                      Dispatch Shipment
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. TAB 4: SHIPMENT TRACKING                                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Supply Corridors & Shipments</h2>
              <p className="text-xs text-slate-500 font-normal">
                Multi-stage tracking for vessel consignments and polar air corridor staging.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/live-map')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Open Live Antarctic Map</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shipments.map((ship) => (
              <div key={ship.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {ship.transportMode === 'Maritime Vessel' ? (
                      <Anchor className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Plane className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-bold text-sm text-slate-900">{ship.carrierOrVessel}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      ship.status === 'In Transit'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ship.status} {ship.delayHours > 0 ? `(+${ship.delayHours}h)` : ''}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-800">{ship.name}</div>

                <div className="text-xs text-slate-600 space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Stage:</span>
                    <strong className="text-slate-900">{ship.currentStage}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Destination:</span>
                    <span className="font-semibold text-slate-900">{ship.destinationStation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Arrival:</span>
                    <strong className="text-[#0284C7]">{ship.eta}</strong>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (ship.linkedRequirementId) {
                        const target = requirements.find((r) => r.id === ship.linkedRequirementId);
                        if (target) setInspectingRequirement(target);
                      }
                    }}
                    className="text-xs font-semibold text-[#0284C7] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Inspect Linked Requirement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. REQUIREMENT DETAIL DRAWER (Section 7)                       */}
      {/* ------------------------------------------------------------- */}
      {inspectingRequirement && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in"
          onClick={() => setInspectingRequirement(null)}
        >
          <div
            className="w-full max-w-xl sm:max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-[#0284C7] uppercase tracking-wider flex items-center space-x-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Requirement Dossier</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {inspectingRequirement.itemName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRequirement(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Compact Lifecycle Progress Stepper (Section 3 & 9) */}
            <div className="p-4 bg-white border-b border-slate-100 overflow-x-auto scrollbar-none">
              <div className="flex items-center space-x-1 text-[11px] min-w-max">
                {(
                  [
                    'Submitted',
                    'Under Review',
                    'Approved',
                    'In Procurement',
                    'Ordered',
                    'In Transit',
                    'Fulfilled',
                  ] as const
                ).map((stage, idx, arr) => {
                  const stageOrder = {
                    Draft: 0,
                    Submitted: 1,
                    'Under Review': 2,
                    Approved: 3,
                    Merged: 3,
                    'In Procurement': 4,
                    Ordered: 5,
                    'In Transit': 6,
                    'Partially Fulfilled': 6,
                    Fulfilled: 7,
                    Rejected: -1,
                    Cancelled: -1,
                  };
                  const currentStageIdx = stageOrder[inspectingRequirement.status] || 1;
                  const stepIdx = idx + 1;
                  const isDone = currentStageIdx >= stepIdx;
                  const isCurrent = currentStageIdx === stepIdx;

                  return (
                    <React.Fragment key={stage}>
                      <div
                        className={`flex items-center space-x-1 px-2 py-1 rounded-md transition ${
                          isCurrent
                            ? 'bg-sky-100 text-[#0284C7] font-bold'
                            : isDone
                            ? 'text-emerald-700 font-medium'
                            : 'text-slate-400 font-normal'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            isCurrent
                              ? 'bg-[#0284C7] text-white'
                              : isDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isDone ? '✓' : stepIdx}
                        </span>
                        <span>{stage}</span>
                      </div>
                      {idx < arr.length - 1 && <span className="text-slate-300 font-mono">→</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs font-sans">
              {/* SECTION A: REQUIREMENT SUMMARY */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Originating Source
                    </span>
                    <span className="font-bold text-sm text-slate-900 mt-0.5 flex items-center space-x-1.5">
                      {inspectingRequirement.sourceType === 'Station' ? (
                        <Building2 className="w-4 h-4 text-[#0284C7]" />
                      ) : (
                        <Compass className="w-4 h-4 text-indigo-600" />
                      )}
                      <span>{inspectingRequirement.sourceName}</span>
                    </span>
                    <div className="text-slate-600 mt-0.5">
                      Submitted by: <strong className="text-slate-800">{inspectingRequirement.raisedBy}</strong> ({inspectingRequirement.role})
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      inspectingRequirement.urgency === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : inspectingRequirement.urgency === 'HIGH'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {inspectingRequirement.urgency} Urgency
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase block">Requested Qty</span>
                    <span className="font-bold text-slate-900 text-xs block">
                      {inspectingRequirement.quantity} {inspectingRequirement.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase block">Required By</span>
                    <span className="font-bold text-slate-900 text-xs block">
                      {inspectingRequirement.requiredByDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase block">Lead Window</span>
                    <span className="font-semibold text-slate-800 text-xs block">
                      {inspectingRequirement.requiredWithin}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase block">Registered On</span>
                    <span className="font-semibold text-slate-800 text-xs block">
                      {inspectingRequirement.createdAt}
                    </span>
                  </div>
                </div>

                {inspectingRequirement.urgencyReason && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Operational Context</span>
                    <p className="text-slate-700 font-normal mt-0.5 leading-relaxed">
                      {inspectingRequirement.urgencyReason}
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION B: SUPPLY & INVENTORY CONTEXT (Section 7.B) */}
              {inspectingRequirement.supplyContext && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                      <Boxes className="w-4 h-4 text-[#0284C7]" />
                      <span>Station Inventory Context</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      Telemetry Synced
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Current Stock</span>
                      <strong className="text-slate-900 text-sm block mt-0.5">
                        {inspectingRequirement.supplyContext.currentStock} {inspectingRequirement.unit}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Safety Minimum</span>
                      <strong className="text-slate-900 text-sm block mt-0.5">
                        {inspectingRequirement.supplyContext.minimumSafeStock} {inspectingRequirement.unit}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Days of Supply</span>
                      <strong className="text-amber-700 text-sm block mt-0.5">
                        ~{inspectingRequirement.supplyContext.daysOfSupply} days
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Daily Burn</span>
                      <strong className="text-slate-800 text-xs block mt-0.5">
                        {inspectingRequirement.supplyContext.dailyConsumption} {inspectingRequirement.unit}/day
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Projected Stockout</span>
                      <strong className="text-rose-700 text-xs block mt-0.5">
                        {inspectingRequirement.supplyContext.projectedStockout}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Incoming Active</span>
                      <strong className="text-slate-800 text-xs block mt-0.5">
                        {inspectingRequirement.supplyContext.incomingQuantity} {inspectingRequirement.unit}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION C: AI SUPPLY ANALYSIS (Visually Distinct Decision Support - Section 7.C) */}
              {inspectingRequirement.aiForecast && (
                <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-sky-900 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-[#0284C7]" />
                      <span>AI Recommendation (Decision Support Only)</span>
                    </div>
                    <span className="text-[10px] font-mono text-sky-700 font-semibold bg-sky-100 px-2 py-0.5 rounded">
                      Model Confidence: High
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Recommended Urgency</span>
                      <span className="font-bold text-rose-700 block mt-0.5">
                        {inspectingRequirement.aiForecast.recommendation}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Recommended Quantity</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {inspectingRequirement.aiForecast.recommendedQuantity} {inspectingRequirement.unit}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Projected Stockout</span>
                      <span className="font-bold text-slate-900 block mt-0.5">
                        {inspectingRequirement.aiForecast.projectedStockoutDate} (~{inspectingRequirement.aiForecast.projectedStockoutDays}d)
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/90 rounded-xl border border-sky-100 text-slate-700 font-normal leading-relaxed text-[11px]">
                    <strong className="text-slate-900">AI Rationale: </strong>
                    {inspectingRequirement.aiForecast.rationale}
                  </div>

                  <div className="text-[10px] text-slate-400 italic">
                    * AI is strictly for decision assistance. Authorization and supplier finalization must be confirmed by the Logistics Commander.
                  </div>
                </div>
              )}

              {/* SECTION D: RELATED REQUIREMENTS & CONSOLIDATION (Section 7.D & 8) */}
              {(() => {
                const related = getRelatedRequirements(inspectingRequirement);
                if (related.length === 0) return null;

                const combinedQty = inspectingRequirement.quantity + related.reduce((acc, r) => acc + r.quantity, 0);

                return (
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs">
                        <Merge className="w-4 h-4 text-amber-600" />
                        <span>Related Requirements in Pool ({related.length})</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Combined: {combinedQty} {inspectingRequirement.unit}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {related.map((r) => (
                        <div
                          key={r.id}
                          className="p-2.5 bg-white rounded-xl border border-amber-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">{r.itemName}</div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {r.sourceName} • {r.quantity} {r.unit} • Urgency: <strong>{r.urgency}</strong>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {canConsolidate && inspectingRequirement.status !== 'Merged' && (
                      <button
                        type="button"
                        onClick={() => handleOpenConsolidationModal([inspectingRequirement, ...related])}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs flex items-center justify-center space-x-1.5"
                      >
                        <Merge className="w-3.5 h-3.5" />
                        <span>Consolidate with Related Requirements ({combinedQty} {inspectingRequirement.unit})</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* SECTION E: DOWNSTREAM PROCUREMENT / ORDER / SHIPMENT TRACKING (Section 9, 10, 11) */}
              {inspectingRequirement.procurementData && (
                <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-200/80 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-sky-900">
                    <Tag className="w-4 h-4 text-[#0284C7]" />
                    <span>Downstream Procurement Progress</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tender Code</span>
                      <strong className="font-mono text-slate-900">{inspectingRequirement.procurementData.tenderReference}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bidding Portal</span>
                      <strong className="text-slate-900">{inspectingRequirement.procurementData.portal}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Current Stage</span>
                      <strong className="text-sky-800">{inspectingRequirement.procurementData.procurementStage}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Target Closing</span>
                      <strong className="text-slate-900">{inspectingRequirement.procurementData.targetClosingDate}</strong>
                    </div>
                  </div>
                </div>
              )}

              {inspectingRequirement.orderData && (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Finalized Purchase Order</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Order Reference</span>
                      <strong className="font-mono text-slate-900">{inspectingRequirement.orderData.orderReference}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Awarded Supplier</span>
                      <strong className="text-emerald-800">{inspectingRequirement.orderData.supplierName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Dispatch Ready</span>
                      <strong className="text-slate-900">{inspectingRequirement.orderData.expectedDispatch}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Order Status</span>
                      <strong className="text-slate-900">{inspectingRequirement.orderData.orderStatus}</strong>
                    </div>
                  </div>
                </div>
              )}

              {inspectingRequirement.shipmentData && (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-indigo-900">
                      <Truck className="w-4 h-4 text-indigo-600" />
                      <span>Shipment & Transit Tracking</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {inspectingRequirement.shipmentData.delayStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Carrier / Vessel</span>
                      <strong className="text-slate-900">{inspectingRequirement.shipmentData.carrierOrVessel}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Current Stage</span>
                      <strong className="text-slate-900">{inspectingRequirement.shipmentData.currentStage}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Estimated Arrival</span>
                      <strong className="text-[#0284C7]">{inspectingRequirement.shipmentData.eta}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Destination Base</span>
                      <strong className="text-slate-900">{inspectingRequirement.shipmentData.destination}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingRequirement(null);
                      setActiveTab('tracking');
                    }}
                    className="w-full py-1.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-xl font-semibold cursor-pointer transition text-[11px] flex items-center justify-center space-x-1"
                  >
                    <span>View in Shipment Tracking Tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Clarification Notes if any */}
              {inspectingRequirement.clarificationNotes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Command Clarification Request</span>
                  <p className="text-slate-700 font-normal leading-relaxed">{inspectingRequirement.clarificationNotes}</p>
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions Bar (Role-Based Dynamic Actions) */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setInspectingRequirement(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close Dossier
              </button>

              <div className="flex items-center space-x-2">
                {/* Logistics Commander Authority Controls */}
                {canApproveOrReject && (inspectingRequirement.status === 'Submitted' || inspectingRequirement.status === 'Under Review') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenClarification(inspectingRequirement)}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Request Clarification
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(inspectingRequirement.id)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(inspectingRequirement.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      Approve Requirement
                    </button>
                  </>
                )}

                {canCreateProcurement && inspectingRequirement.status === 'Approved' && (
                  <button
                    type="button"
                    onClick={() => handleOpenProcurement(inspectingRequirement)}
                    className="px-4 py-2 bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs flex items-center space-x-1.5"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Create Procurement Request</span>
                  </button>
                )}

                {canFinalizeOrders && inspectingRequirement.status === 'In Procurement' && (
                  <button
                    type="button"
                    onClick={() => handleOpenFinalizeOrder(inspectingRequirement)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs flex items-center space-x-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Finalize Order Contract</span>
                  </button>
                )}

                {isLogisticsCommander && inspectingRequirement.status === 'Ordered' && (
                  <button
                    type="button"
                    onClick={() => handleOpenDispatchShipment(inspectingRequirement)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs flex items-center space-x-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatch Shipment</span>
                  </button>
                )}

                {isLogisticsCommander && inspectingRequirement.status === 'In Transit' && (
                  <button
                    type="button"
                    onClick={() => handleMarkFulfilled(inspectingRequirement.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Receipt & Fulfill</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. ADD REQUIREMENT MODAL (Section 6)                         */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Operational Requirement"
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddRequirementSubmit(false);
            }}
            className="space-y-4 text-xs font-sans"
          >
            {/* Requester Identity Callout */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Authenticated Requester</span>
                <span className="font-bold text-slate-900">
                  {currentUser?.name || (isStationManager ? 'Dr. Rajesh Nair' : isExpeditionLeader ? 'Dr. Anita Singh' : 'Cmdr. Vikram Malhotra')}
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200">
                {isStationManager
                  ? 'Station Manager'
                  : isExpeditionLeader
                  ? 'Expedition Planner'
                  : isLogisticsCommander
                  ? 'Logistics Commander'
                  : 'Operations Officer'}
              </span>
            </div>

            {/* Authenticated Scoped Target (No station dropdown for Station Manager) */}
            {isStationManager ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Station</span>
                  <span className="font-bold text-slate-900">{currentStationName}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200">
                  Assigned Station Scope
                </span>
              </div>
            ) : isExpeditionLeader ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Expedition</span>
                  <span className="font-bold text-slate-900">{currentExpeditionTitle}</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200">
                  Assigned Expedition Scope
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Source Domain</label>
                  <select
                    value={newReqType}
                    onChange={(e) => {
                      const t = e.target.value as 'Station' | 'Expedition';
                      setNewReqType(t);
                      setNewReqTarget(t === 'Station' ? (stations[0]?.name || 'Bharati Station') : (expeditions[0]?.title || 'Amery Ice Shelf Deep Core Mission'));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  >
                    <option value="Station">Station (Permanent Base)</option>
                    <option value="Expedition">Expedition (Field Traverse)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Station / Mission Name</label>
                  {newReqType === 'Station' ? (
                    <select
                      value={newReqTarget}
                      onChange={(e) => setNewReqTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                    >
                      {stations.length > 0 ? (
                        stations.map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Bharati Station">Bharati Station (Larsemann Hills)</option>
                          <option value="Maitri Station">Maitri Station (Queen Maud Land)</option>
                          <option value="Himadri Base">Himadri Polar Research Base</option>
                        </>
                      )}
                    </select>
                  ) : (
                    <select
                      value={newReqTarget}
                      onChange={(e) => setNewReqTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                    >
                      {expeditions.length > 0 ? (
                        expeditions.map((exp) => (
                          <option key={exp.id} value={exp.title}>
                            {exp.title}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Amery Ice Shelf Deep Core Mission">Amery Ice Shelf Deep Core Mission</option>
                          <option value="44th Indian Antarctic Expedition">44th Indian Antarctic Expedition</option>
                        </>
                      )}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Live Context Telemetry Panel (Section 6: Station Inventory or Expedition Mission Context) */}
            {newReqType === 'Station' ? (
              <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-sky-900 font-bold">
                    <Building2 className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Station Inventory Status ({newReqTarget})</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold">
                    Live Telemetry
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Current Stock</span>
                    <strong className="text-slate-900 text-xs">
                      {newReqItem.toLowerCase().includes('fuel') || newReqItem.toLowerCase().includes('kerosene')
                        ? '12,000 L'
                        : newReqItem.toLowerCase().includes('filter')
                        ? '2 sets'
                        : newReqItem.toLowerCase().includes('medical')
                        ? '4 kits'
                        : '8 units'}
                    </strong>
                  </div>
                  <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Safety Min</span>
                    <strong className="text-slate-900 text-xs">
                      {newReqItem.toLowerCase().includes('fuel') || newReqItem.toLowerCase().includes('kerosene')
                        ? '6,000 L'
                        : newReqItem.toLowerCase().includes('filter')
                        ? '8 sets'
                        : newReqItem.toLowerCase().includes('medical')
                        ? '15 kits'
                        : '15 units'}
                    </strong>
                  </div>
                  <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Burn Rate</span>
                    <strong className="text-slate-900 text-xs">
                      {newReqItem.toLowerCase().includes('fuel') ? '250 L/day' : '~1.2/day'}
                    </strong>
                  </div>
                  <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Days Left</span>
                    <strong className="text-rose-600 text-xs">~3.5 days</strong>
                  </div>
                </div>
                <div className="text-[10px] text-sky-800 font-medium">
                  Current on-hand quantity is below safety threshold. Requisition will replenish base reserves.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-indigo-900 font-bold">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Expedition Field Context ({newReqTarget})</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                    Field Traverse
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-white/90 p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Traverse Window</span>
                    <strong className="text-slate-900 text-xs">15 Nov - 28 Feb</strong>
                  </div>
                  <div className="bg-white/90 p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Staging Base</span>
                    <strong className="text-slate-900 text-xs">Maitri Runway</strong>
                  </div>
                  <div className="bg-white/90 p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">Logistics Corridor</span>
                    <strong className="text-indigo-700 text-xs">Air / Sledge</strong>
                  </div>
                </div>
                <div className="text-[10px] text-indigo-800 font-medium">
                  Requisitions must be staged at base runway prior to traverse convoy departure.
                </div>
              </div>
            )}

            {/* Quick Presets for Polar Items */}
            <div>
              <span className="text-[11px] text-slate-400 font-medium mb-1 block">Quick Select Common Polar Items:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Field Medical Kits', cat: 'Medical' as SupplyCategory, unit: 'kits' },
                  { name: 'Generator Cold-Start Filters', cat: 'Spare Parts' as SupplyCategory, unit: 'sets' },
                  { name: 'Polar Aviation Kerosene', cat: 'Fuel' as SupplyCategory, unit: 'liters' },
                  { name: 'Firn Core Thermal Containers', cat: 'Scientific' as SupplyCategory, unit: 'crates' },
                  { name: 'High-Altitude VHF Batteries', cat: 'Communication' as SupplyCategory, unit: 'packs' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setNewReqItem(preset.name);
                      setNewReqCategory(preset.cat);
                      setNewReqUnit(preset.unit);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Name & Category */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Item Required</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field Medical Kits, Cold-Start Filters"
                  value={newReqItem}
                  onChange={(e) => setNewReqItem(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <select
                  value={newReqCategory}
                  onChange={(e) => setNewReqCategory(e.target.value as SupplyCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="Medical">Medical</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Food">Food</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Spare Parts">Spare Parts</option>
                  <option value="Scientific">Scientific</option>
                  <option value="Communication">Communication</option>
                  <option value="Safety">Safety</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newReqQty}
                  onChange={(e) => setNewReqQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Unit of Measure</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. kits, liters, sets, crates"
                  value={newReqUnit}
                  onChange={(e) => setNewReqUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
                />
              </div>
            </div>

            {/* Required Within & Urgency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Required Within</label>
                <select
                  value={newReqRequiredWithin}
                  onChange={(e) => setNewReqRequiredWithin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="7 days">7 days (Immediate Shortage)</option>
                  <option value="14 days">14 days (High Urgency)</option>
                  <option value="20 days">20 days (Nominal)</option>
                  <option value="30 days">30 days (Upcoming Seasonal)</option>
                  <option value="45 days">45 days (Routine)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Manual Urgency</label>
                <select
                  value={newReqUrgency}
                  onChange={(e) => setNewReqUrgency(e.target.value as OperationalUrgency)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="NORMAL">Normal Urgency</option>
                  <option value="HIGH">High Urgency</option>
                  <option value="CRITICAL">Critical Urgency</option>
                </select>
              </div>
            </div>

            {/* Reason / Purpose */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Operational Purpose / Justification</label>
              <input
                type="text"
                required
                placeholder="Explain the field context, shortage cause or mission requirement..."
                value={newReqReason}
                onChange={(e) => setNewReqReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Additional Field Notes</label>
              <textarea
                rows={2}
                placeholder="Insulation specs, special sub-zero packaging, handling instructions..."
                value={newReqNotes}
                onChange={(e) => setNewReqNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleAddRequirementSubmit(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
              >
                Save Draft
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0284C7] hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs"
                >
                  Submit Requirement
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 11. CONSOLIDATION MODAL (Section 8)                           */}
      {/* ------------------------------------------------------------- */}
      {isConsolidateModalOpen && (
        <Modal
          isOpen={isConsolidateModalOpen}
          onClose={() => setIsConsolidateModalOpen(false)}
          title="Consolidate Related Operational Requirements"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-slate-600 font-normal leading-relaxed">
              Review and merge related requirements from multiple stations and expeditions into a unified bulk procurement requisition. Original sources will be preserved in the audit log.
            </p>

            {/* Items Selection List */}
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-60 overflow-y-auto">
              {requirements
                .filter((r) => selectedReqIds.has(r.id))
                .map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{req.itemName}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Source: <strong>{req.sourceName}</strong> • Requested: <strong>{req.quantity} {req.unit}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Required by: {req.requiredByDate} • Urgency: {req.urgency}
                      </div>
                    </div>
                    <span className="text-emerald-700 font-mono font-bold">
                      +{req.quantity} {req.unit}
                    </span>
                  </div>
                ))}
            </div>

            {/* Metrics Breakdown */}
            {(() => {
              const selectedList = requirements.filter((r) => selectedReqIds.has(r.id));
              const combinedQty = selectedList.reduce((acc, cur) => acc + cur.quantity, 0);
              const aiQty = Math.round(combinedQty * 1.1);

              return (
                <div className="grid grid-cols-2 gap-3 p-3 bg-sky-50 border border-sky-100 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Combined Requested Qty</span>
                    <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                      {combinedQty} {selectedList[0]?.unit || 'units'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">AI Recommended Tender Qty</span>
                    <strong className="text-sm font-bold text-[#0284C7] block mt-0.5">
                      {aiQty} {selectedList[0]?.unit || 'units'} (+10% safety buffer)
                    </strong>
                  </div>
                </div>
              );
            })()}

            {/* Title & Notes Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Consolidated Requisition Name</label>
                <input
                  type="text"
                  value={consolidationTitle}
                  onChange={(e) => setConsolidationTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Consolidation Operational Notes</label>
                <textarea
                  rows={2}
                  value={consolidationNotes}
                  onChange={(e) => setConsolidationNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsConsolidateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConsolidation}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs flex items-center space-x-1.5"
              >
                <Merge className="w-3.5 h-3.5" />
                <span>Confirm & Create Consolidated Requirement</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 12. CREATE PROCUREMENT REQUEST MODAL (Section 9)              */}
      {/* ------------------------------------------------------------- */}
      {isProcurementModalOpen && targetReqForAction && (
        <Modal
          isOpen={isProcurementModalOpen}
          onClose={() => setIsProcurementModalOpen(false)}
          title="Create Procurement Request"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmProcurement} className="space-y-3.5 text-xs font-sans">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Requirement</span>
              <div className="font-bold text-sm text-slate-900 mt-0.5">{targetReqForAction.itemName}</div>
              <div className="text-slate-600 text-xs">
                Quantity: <strong>{targetReqForAction.quantity} {targetReqForAction.unit}</strong> for <strong>{targetReqForAction.sourceName}</strong>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tender / RFQ Reference Code</label>
              <input
                type="text"
                required
                value={tenderRefInput}
                onChange={(e) => setTenderRefInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Portal</label>
                <select
                  value={tenderPortal}
                  onChange={(e) => setTenderPortal(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="GeM">GeM (Government e-Marketplace)</option>
                  <option value="NCPOR Portal">NCPOR Official Portal</option>
                  <option value="Direct Emergency">Direct Emergency Sourcing</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Closing Date</label>
                <input
                  type="date"
                  required
                  value={tenderTargetDate}
                  onChange={(e) => setTenderTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Estimated Budget / Value</label>
              <input
                type="text"
                value={tenderEstimatedBudget}
                onChange={(e) => setTenderEstimatedBudget(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsProcurementModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0284C7] hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs flex items-center space-x-1"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Transition to In Procurement</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 13. FINALIZE ORDER MODAL (Section 10)                         */}
      {/* ------------------------------------------------------------- */}
      {isFinalizeOrderModalOpen && targetReqForAction && (
        <Modal
          isOpen={isFinalizeOrderModalOpen}
          onClose={() => setIsFinalizeOrderModalOpen(false)}
          title="Finalize Procurement Order"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmFinalizeOrder} className="space-y-3.5 text-xs font-sans">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Procurement Record</span>
              <div className="font-bold text-slate-900">{targetReqForAction.itemName}</div>
              <div className="text-slate-600 text-xs">
                Tender: <span className="font-mono">{targetReqForAction.procurementData?.tenderReference || 'GeM/2026/POLAR/042'}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Awarded Vendor / Supplier</label>
              <select
                value={orderSupplier}
                onChange={(e) => setOrderSupplier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                <option value="Apex Polar Health Systems Ltd.">Apex Polar Health Systems Ltd.</option>
                <option value="Kirloskar Polar Engineering Division">Kirloskar Polar Engineering Division</option>
                <option value="Indian Oil Corporation Ltd. (Aviation Polar Cell)">Indian Oil Corporation Ltd. (Aviation Polar Cell)</option>
                <option value="TotalEnergies Polar Specialty Fluids">TotalEnergies Polar Specialty Fluids</option>
                <option value="Garware Technical Fibres Ltd.">Garware Technical Fibres Ltd.</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Purchase Order Reference</label>
              <input
                type="text"
                required
                value={orderRefInput}
                onChange={(e) => setOrderRefInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Expected Dispatch Date</label>
                <input
                  type="date"
                  required
                  value={orderDispatchDate}
                  onChange={(e) => setOrderDispatchDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Expected Base Arrival</label>
                <input
                  type="date"
                  required
                  value={orderArrivalDate}
                  onChange={(e) => setOrderArrivalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsFinalizeOrderModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs flex items-center space-x-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Confirm & Finalize Order</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 14. DISPATCH SHIPMENT MODAL (Section 11)                      */}
      {/* ------------------------------------------------------------- */}
      {isDispatchModalOpen && targetReqForAction && (
        <Modal
          isOpen={isDispatchModalOpen}
          onClose={() => setIsDispatchModalOpen(false)}
          title="Dispatch Polar Shipment"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmDispatchShipment} className="space-y-3.5 text-xs font-sans">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Finalized Order</span>
              <div className="font-bold text-slate-900">{targetReqForAction.itemName}</div>
              <div className="text-slate-600 text-xs">
                Destination: <strong>{targetReqForAction.sourceName}</strong>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Carrier / Vessel Name</label>
              <select
                value={shipmentCarrier}
                onChange={(e) => setShipmentCarrier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                <option value="MV Polar Queen">MV Polar Queen (Ice-Class Cargo Vessel)</option>
                <option value="DROMLAN Polar Air Corridor (IL-76)">DROMLAN Polar Air Corridor (Heavy Cargo Aircraft)</option>
                <option value="PistenBully PB-07 Heavy Traverse">PistenBully PB-07 Heavy Traverse (Over-Snow Sledge)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Transport Mode</label>
                <select
                  value={shipmentMode}
                  onChange={(e) => setShipmentMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="Maritime Vessel">Maritime Vessel</option>
                  <option value="Polar Air Corridor">Polar Air Corridor</option>
                  <option value="Over-Snow Traverse">Over-Snow Traverse</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Initial Stage</label>
                <select
                  value={shipmentStage}
                  onChange={(e) => setShipmentStage(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                >
                  <option value="Cape Town Staging">Cape Town Staging</option>
                  <option value="Ocean Transit">Ocean Transit</option>
                  <option value="Ice Runway Approach">Ice Runway Approach</option>
                  <option value="Traverse Staging">Traverse Staging</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Estimated Station Arrival (ETA)</label>
              <input
                type="text"
                required
                value={shipmentEta}
                onChange={(e) => setShipmentEta(e.target.value)}
                placeholder="e.g. 18 Oct 2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs flex items-center space-x-1"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Confirm Dispatch & Start Tracking</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 15. REQUEST CLARIFICATION MODAL                               */}
      {/* ------------------------------------------------------------- */}
      {isClarificationModalOpen && targetReqForAction && (
        <Modal
          isOpen={isClarificationModalOpen}
          onClose={() => setIsClarificationModalOpen(false)}
          title="Request Requirement Clarification"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveClarification} className="space-y-3.5 text-xs font-sans">
            <p className="text-slate-600 font-normal">
              Prompt the station manager or expedition planner for technical specifics or buffer justification:
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Clarification Message</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Please verify current stock count of spare filter cartridges before we issue bulk RFQ..."
                value={clarificationText}
                onChange={(e) => setClarificationText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsClarificationModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs"
              >
                Send Request
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

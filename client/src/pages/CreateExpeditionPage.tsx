import React, { useState, useEffect } from 'react';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  MapPin,
  Building2,
  Users,
  Shield,
  Layers,
  FileText,
  Truck,
  Package,
  CheckSquare,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Flag,
} from 'lucide-react';
import { useExpedition } from '../context/ExpeditionContext';
import { createExpedition, fetchAllUsers, publishExpedition } from '../services/api';
import { User } from '../types';

interface CreateExpeditionPageProps {
  onNavigate?: (path: string) => void;
  onCancel?: () => void;
  onCreated?: (expedition: any) => void;
}

export const CreateExpeditionPage: React.FC<CreateExpeditionPageProps> = ({
  onNavigate = () => {},
  onCancel,
  onCreated,
}) => {
  const { switchExpedition, triggerRefresh } = useExpedition();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Step 1: Basic Information
  const [code, setCode] = useState('ARCTIC-2028');
  const [title, setTitle] = useState('Arctic Cryosphere & Climate Traverse');
  const [type, setType] = useState('Atmospheric & Climate Science');
  const [missionObjective, setMissionObjective] = useState(
    'Atmospheric boundary layer profiling, Svalbard glacier mass balance, sea-ice thickness profiling, and rapid response meteorological monitoring.'
  );
  const [priority, setPriority] = useState('HIGH');
  const [startDate, setStartDate] = useState('2028-03-01');
  const [endDate, setEndDate] = useState('2029-03-31');
  const [notes, setNotes] = useState('Joint international polar institute scientific expedition.');

  // Step 2: Command
  const [commanderId, setCommanderId] = useState('');
  const [commanderName, setCommanderName] = useState('Dr. Priya Sharma');
  const [commanderEmail, setCommanderEmail] = useState('priya.sharma@polarops.org');
  const [commanderCallsign, setCommanderCallsign] = useState('ARCTIC-LEAD-01');

  // Step 3: Crew (At least 5 field members)
  const [crew, setCrew] = useState([
    {
      name: 'Elena Rostova',
      role: 'Lead Field Specialist',
      qualification: 'Polar Glaciologist & Alpine Traverse Scout',
      emergencyAvailability: 'Available',
      contactInfo: 'VHF Ch-16 / Iridium 8816-01',
      stationIndex: 0,
    },
    {
      name: 'Dr. Anita Singh',
      role: 'Senior Medical Officer',
      qualification: 'Trauma & Extreme Hypothermia Specialist',
      emergencyAvailability: 'Available',
      contactInfo: 'VHF Ch-16 / Medical Duplex',
      stationIndex: 0,
    },
    {
      name: 'Liam O\'Connor',
      role: 'Heavy Equipment Mechanic',
      qualification: 'Diesel Systems & Snowcat Specialist',
      emergencyAvailability: 'Available',
      contactInfo: 'VHF Ch-09 Base',
      stationIndex: 0,
    },
    {
      name: 'Nikolai Morozov',
      role: 'Atmospheric Radar Engineer',
      qualification: 'Meteorological Sensors & LiDAR',
      emergencyAvailability: 'Available',
      contactInfo: 'VHF Ch-11 Science',
      stationIndex: 0,
    },
    {
      name: 'Freja Lindholm',
      role: 'Environmental Safety Officer',
      qualification: 'Crevasse Rescue & Glacier Hydrology',
      emergencyAvailability: 'Available',
      contactInfo: 'VHF Ch-16 / SAR Link',
      stationIndex: 1,
    },
  ]);

  // Step 4: Stations & Transit Corridors
  const [stations, setStations] = useState([
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
  ]);
  const [origin, setOrigin] = useState('Tromsø Polar Logistics Base, Norway');
  const [destination, setDestination] = useState('Ny-Ålesund Research Station, Svalbard');
  const [intermediateHubs, setIntermediateHubs] = useState('Longyearbyen Air Staging Port');
  const [transportModes, setTransportModes] = useState('Icebreaker Vessel, Twin Otter Ski-Plane, Snowcat');

  // Step 5: Assets
  const [assets, setAssets] = useState([
    {
      name: 'PistenBully 300 Polar Snowcat',
      assetCode: 'AST-01',
      type: 'Snow Vehicle',
      stationIndex: 0,
      operatingHours: 120,
      maintenanceInterval: 2000,
      currentCondition: 'Good',
    },
    {
      name: 'DHC-6 Twin Otter Ski-Plane',
      assetCode: 'AST-02',
      type: 'Ski-Plane',
      stationIndex: 1,
      operatingHours: 350,
      maintenanceInterval: 1000,
      currentCondition: 'Good',
    },
    {
      name: 'Caterpillar C9 250kVA Generator',
      assetCode: 'AST-03',
      type: 'Power Generation',
      stationIndex: 0,
      operatingHours: 480,
      maintenanceInterval: 2500,
      currentCondition: 'Good',
    },
    {
      name: 'Iridium Extreme SATCOM Remote Terminal',
      assetCode: 'AST-04',
      type: 'Communications',
      stationIndex: 0,
      operatingHours: 90,
      maintenanceInterval: 5000,
      currentCondition: 'Optimal',
    },
  ]);

  // Step 6: Planned Cargo
  const [cargo, setCargo] = useState([
    {
      cargoCode: 'CRG-001',
      description: 'Arctic Winter Polar Diesel Fuel Reserve',
      category: 'Fuel',
      weightKg: 12000,
      quantity: 12000,
      priority: 'CRITICAL',
      transportMode: 'Vessel',
      eta: '2028-03-15',
      specialRequirements: 'Hazardous Class 3 Flammable - Insulated Tankers',
    },
    {
      cargoCode: 'CRG-002',
      description: 'Trauma Surgical & Hypothermia Treatment Modules',
      category: 'Medicine',
      weightKg: 450,
      quantity: 350,
      priority: 'CRITICAL',
      transportMode: 'Air',
      eta: '2028-03-08',
      specialRequirements: 'Temperature-Controlled +4C to +15C',
    },
    {
      cargoCode: 'CRG-003',
      description: 'Freeze-Dried High-Calorie Polar Ration Packs',
      category: 'Food',
      weightKg: 2200,
      quantity: 1800,
      priority: 'HIGH',
      transportMode: 'Vessel',
      eta: '2028-03-18',
      specialRequirements: 'Moisture Barrier Sealed',
    },
    {
      cargoCode: 'CRG-004',
      description: 'Deep-Ice Core Electro-Mechanical Drillbits',
      category: 'Technical',
      weightKg: 850,
      quantity: 12,
      priority: 'MEDIUM',
      transportMode: 'Air',
      eta: '2028-03-22',
      specialRequirements: 'Fragile Scientific Precision Calibrated',
    },
  ]);

  // Step 7: Initial Operational Tasks
  const [tasks, setTasks] = useState([
    {
      title: 'Glacier Core Sample Retrieval at North Ridge',
      description: 'Collect 10-meter firn core samples along the upper accumulation zone of Kronebreen glacier.',
      priority: 'HIGH',
      location: 'Kronebreen Sector 4',
      dueTime: '2028-03-12',
      assignedCrewIndex: 0, // Elena
    },
    {
      title: 'Baseline Medical Readiness & Trauma Pack Inspection',
      description: 'Audit station surgical modules, hypothermia rewarming kits, and oxygen cylinders.',
      priority: 'HIGH',
      location: 'Himadri Medical Station',
      dueTime: '2028-03-05',
      assignedCrewIndex: 1, // Anita
    },
    {
      title: 'Primary Base Diesel Generator 500h Pre-Winter Service',
      description: 'Inspect fuel injectors, replace oil filters, and test secondary grid switchover.',
      priority: 'CRITICAL',
      location: 'Himadri Power Plant',
      dueTime: '2028-03-07',
      assignedCrewIndex: 2, // Liam
    },
    {
      title: 'AWS Automated Weather Station Sensor Calibration',
      description: 'Calibrate ultrasonic anemometer and barometric pressure array on AWS-North mast.',
      priority: 'MEDIUM',
      location: 'AWS Mast Ridge',
      dueTime: '2028-03-14',
      assignedCrewIndex: 3, // Nikolai
    },
    {
      title: 'Kongsfjorden Fjord Fast-Ice Thickness Profiling',
      description: 'Perform electromagnetic ground conductivity soundings along the primary snowcat traverse corridor.',
      priority: 'MEDIUM',
      location: 'Kongsfjorden Fjord Corridor',
      dueTime: '2028-03-16',
      assignedCrewIndex: 4, // Freja
    },
  ]);

  useEffect(() => {
    fetchAllUsers()
      .then((u) => {
        setUsers(u);
        const commander = u.find((item) => item.role === 'COMMANDER');
        if (commander) {
          setCommanderId(commander.id);
          setCommanderName(commander.name);
          setCommanderEmail(commander.email);
        }
      })
      .catch(() => {});
  }, []);

  const stepNames = [
    'Basic Information',
    'Expedition Command',
    'Crew Assignment',
    'Stations & Corridors',
    'Asset Allocation',
    'Cargo Manifests',
    'Operational Tasks',
    'Review & Publish',
  ];

  // Section 4: Operational Readiness Evaluation Gate
  const evaluateLocalReadiness = () => {
    const blocking: string[] = [];
    const warns: string[] = [];

    // 1. COMMAND
    const hasCommander = !!(commanderName && commanderName.trim().length > 0);
    if (!hasCommander) {
      blocking.push('No Expedition Commander assigned.');
    }

    // 2. PERSONNEL
    if (crew.length === 0) {
      blocking.push('No personnel assigned to expedition crew roster.');
    } else if (crew.length < 2) {
      blocking.push(`Minimum crew requirement not met (assigned: ${crew.length}, required >= 2).`);
    } else if (crew.length < 4) {
      warns.push(`Crew size (${crew.length}) is below recommended expedition baseline of 4.`);
    }

    const hasDoctor = crew.some(
      (c) =>
        c.role.toLowerCase().includes('doctor') ||
        c.role.toLowerCase().includes('medic') ||
        c.qualification.toLowerCase().includes('medical') ||
        c.qualification.toLowerCase().includes('trauma')
    );
    if (!hasDoctor && crew.length >= 2) {
      warns.push('No certified medical responder or trauma specialist assigned to crew roster.');
    }

    // 3. STATIONS
    if (stations.length === 0) {
      blocking.push('No operational stations or forward operating bases configured.');
    }

    // 4. ASSETS
    if (assets.length === 0) {
      blocking.push('No operational vehicles or machinery assets assigned.');
    }
    const failedAssets = assets.filter((a) => a.currentCondition === 'Critical' || a.currentCondition === 'Damaged');
    if (failedAssets.length > 0) {
      blocking.push(`Critical assets damaged/failed: ${failedAssets.map((a) => a.assetCode).join(', ')}`);
    }

    // 5. CARGO
    if (cargo.length === 0) {
      warns.push('No cargo or supply shipments planned for this expedition.');
    }
    const hasFuelOrFood = cargo.some(
      (c) =>
        c.category.toLowerCase().includes('fuel') ||
        c.category.toLowerCase().includes('food') ||
        c.category.toLowerCase().includes('ration')
    );
    if (cargo.length > 0 && !hasFuelOrFood) {
      warns.push('No life-support fuel or ration shipments identified in cargo manifest.');
    }

    // 6. TASKS
    if (tasks.length === 0) {
      warns.push('No initial operational tasks configured for deployment phase.');
    }

    let score = 100;
    score -= blocking.length * 25;
    score -= warns.length * 8;
    score = Math.max(0, Math.min(100, score));

    return {
      isReady: blocking.length === 0,
      score,
      blocking,
      warnings: warns,
      subsystems: {
        command: hasCommander,
        personnel: crew.length >= 2,
        stations: stations.length >= 1,
        assets: assets.length >= 1 && failedAssets.length === 0,
        cargo: cargo.length >= 1,
        inventory: stations.length >= 1,
        tasks: tasks.length >= 1,
        emergency: hasDoctor || crew.length >= 2,
        communication: true,
      },
    };
  };

  const readiness = evaluateLocalReadiness();

  const handleCommission = async (publishImmediately: boolean) => {
    try {
      setIsSubmitting(true);
      const payload = {
        code,
        title,
        type,
        missionObjective,
        commanderId: commanderId || undefined,
        commanderName,
        lifecycleStatus: (publishImmediately ? 'ACTIVE' : 'PLANNED') as any,
        startDate,
        endDate,
        origin,
        destination,
        intermediateHubs,
        transportModes,
        priority,
        notes,
        initialStations: stations.map((s) => ({
          name: s.name,
          code: s.code,
          region: s.region,
          latitude: s.latitude,
          longitude: s.longitude,
          capacity: s.capacity,
        })),
        initialCrew: crew.map((c) => ({
          name: c.name,
          role: c.role,
          qualification: c.qualification,
          emergencyAvailability: c.emergencyAvailability,
          contactInfo: c.contactInfo,
          stationIndex: c.stationIndex,
        })),
        initialAssets: assets.map((a) => ({
          name: a.name,
          assetCode: a.assetCode,
          type: a.type,
          stationIndex: a.stationIndex,
          operatingHours: a.operatingHours,
          maintenanceInterval: a.maintenanceInterval,
          currentCondition: a.currentCondition,
        })),
        initialCargo: cargo.map((cg) => ({
          cargoCode: cg.cargoCode,
          description: cg.description,
          category: cg.category,
          weightKg: cg.weightKg,
          quantity: cg.quantity,
          priority: cg.priority,
          transportMode: cg.transportMode,
          eta: cg.eta,
          specialRequirements: cg.specialRequirements,
        })),
        initialTasks: tasks.map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          location: t.location,
          dueTime: t.dueTime,
          assignedCrewIndex: t.assignedCrewIndex,
        })),
      };

      const created = await createExpedition(payload);

      if (publishImmediately) {
        await publishExpedition(created.id);
      }

      triggerRefresh();
      if (onCreated) {
        onCreated(created);
      } else {
        switchExpedition(created.id);
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to commission expedition');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            type="button"
            onClick={() => (onCancel ? onCancel() : onNavigate('/expeditions'))}
            className="flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel & Back to Expedition Hub</span>
          </button>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Operational Expedition Commissioning Wizard
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-mono font-bold">
              8 Steps
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure polar command, personnel accountability, stations, logistics, assets, and initial tasks
          </p>
        </div>

        {/* Current Step Tracker */}
        <div className="text-right">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">
            Step {step} of 8
          </div>
          <div className="text-xs font-bold text-slate-800">
            {stepNames[step - 1]}
          </div>
        </div>
      </div>

      {/* Step Pills Bar */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
        {stepNames.map((name, idx) => {
          const sNum = idx + 1;
          const isCurrent = step === sNum;
          const isDone = step > sNum;
          return (
            <button
              key={sNum}
              type="button"
              onClick={() => setStep(sNum)}
              className={`px-2 py-1.5 rounded-lg text-left transition flex flex-col justify-center ${
                isCurrent
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : isDone
                  ? 'bg-white text-slate-700 hover:bg-slate-100 border border-emerald-200'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1 text-[10px]">
                {isDone ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ) : (
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isCurrent ? 'bg-white text-sky-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {sNum}
                  </span>
                )}
                <span className="truncate">{sNum}. {name.split(' ')[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
              <span>Step 1: Expedition Identification & Mission Objectives</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expedition Code / Operational ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ARCTIC-2028"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mission Priority *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white font-semibold"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expedition Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Arctic Cryosphere & Climate Traverse"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expedition Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Atmospheric & Cryosphere Traverse"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Window (Start & End)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mission Objective *
              </label>
              <textarea
                required
                rows={3}
                value={missionObjective}
                onChange={(e) => setMissionObjective(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes & Field Directives
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* Step 2: Expedition Command */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
              <span>Step 2: Select Expedition Commander</span>
            </div>

            <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-200 flex items-start space-x-3">
              <Shield className="w-5 h-5 text-sky-700 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-sky-900">
                  Command Authority & Delegation
                </div>
                <div className="text-[11px] text-sky-800 mt-0.5">
                  The Expedition Commander possesses full operational control to execute mitigating actions, assign mission tasks, resolve critical incidents, and sign off on life-safety recommendations.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commander Profile from User Directory *
                </label>
                {users.length > 0 ? (
                  <select
                    value={commanderId}
                    onChange={(e) => {
                      setCommanderId(e.target.value);
                      const u = users.find((item) => item.id === e.target.value);
                      if (u) {
                        setCommanderName(u.name);
                        setCommanderEmail(u.email);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-100 focus:bg-white font-medium"
                  >
                    <option value="">Select Commander from Organization</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role} ({u.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Commander Name"
                    value={commanderName}
                    onChange={(e) => setCommanderName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Command Radio Callsign
                </label>
                <input
                  type="text"
                  value={commanderCallsign}
                  onChange={(e) => setCommanderCallsign(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commander Full Name
                </label>
                <input
                  type="text"
                  value={commanderName}
                  onChange={(e) => setCommanderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Communication Email
                </label>
                <input
                  type="email"
                  value={commanderEmail}
                  onChange={(e) => setCommanderEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Crew Assignment */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Step 3: Assign Field Crew & Accountability Roster ({crew.length} Assigned)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCrew([
                    ...crew,
                    {
                      name: `Field Member ${crew.length + 1}`,
                      role: 'Field Technician',
                      qualification: 'Polar Operations Level 1',
                      emergencyAvailability: 'Available',
                      contactInfo: 'VHF Ch-16',
                      stationIndex: 0,
                    },
                  ])
                }
                className="flex items-center space-x-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Crew Member</span>
              </button>
            </div>

            <div className="space-y-3">
              {crew.map((member, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Crew Member #{idx + 1}
                    </span>
                    {crew.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setCrew(crew.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Name</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const updated = [...crew];
                          updated[idx].name = e.target.value;
                          setCrew(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Role / Responsibility</label>
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) => {
                          const updated = [...crew];
                          updated[idx].role = e.target.value;
                          setCrew(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Qualifications</label>
                      <input
                        type="text"
                        value={member.qualification}
                        onChange={(e) => {
                          const updated = [...crew];
                          updated[idx].qualification = e.target.value;
                          setCrew(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Base Station Assignment</label>
                      <select
                        value={member.stationIndex}
                        onChange={(e) => {
                          const updated = [...crew];
                          updated[idx].stationIndex = parseInt(e.target.value, 10);
                          setCrew(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800"
                      >
                        {stations.map((s, sIdx) => (
                          <option key={sIdx} value={sIdx}>
                            Station {sIdx + 1}: {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Emergency Radio / Comms Link</label>
                      <input
                        type="text"
                        value={member.contactInfo}
                        onChange={(e) => {
                          const updated = [...crew];
                          updated[idx].contactInfo = e.target.value;
                          setCrew(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Stations & Transit Corridors */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Step 4: Operational Base Stations & Transit Corridors</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setStations([
                    ...stations,
                    {
                      name: `Field Outpost ${stations.length + 1}`,
                      code: `STN-0${stations.length + 1}`,
                      region: 'Arctic Polar Sector',
                      latitude: 78.95,
                      longitude: 12.1,
                      capacity: 10,
                    },
                  ])
                }
                className="flex items-center space-x-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Station</span>
              </button>
            </div>

            <div className="space-y-3">
              {stations.map((st, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Station {idx + 1}: {st.name}
                      </span>
                    </div>
                    {stations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setStations(stations.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Station Name</label>
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => {
                          const updated = [...stations];
                          updated[idx].name = e.target.value;
                          setStations(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Code</label>
                      <input
                        type="text"
                        value={st.code}
                        onChange={(e) => {
                          const updated = [...stations];
                          updated[idx].code = e.target.value.toUpperCase();
                          setStations(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Bunk Capacity</label>
                      <input
                        type="number"
                        value={st.capacity}
                        onChange={(e) => {
                          const updated = [...stations];
                          updated[idx].capacity = parseInt(e.target.value, 10);
                          setStations(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Region</label>
                      <input
                        type="text"
                        value={st.region}
                        onChange={(e) => {
                          const updated = [...stations];
                          updated[idx].region = e.target.value;
                          setStations(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={st.latitude}
                        onChange={(e) => {
                          const updated = [...stations];
                          updated[idx].latitude = parseFloat(e.target.value);
                          setStations(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={st.longitude}
                        onChange={(e) => {
                          const updated = [...stations];
                          updated[idx].longitude = parseFloat(e.target.value);
                          setStations(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>Maritime, Air & Terrestrial Corridors</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Origin Base</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Primary Destination</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Intermediate Staging Hubs</label>
                  <input
                    type="text"
                    value={intermediateHubs}
                    onChange={(e) => setIntermediateHubs(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Transport Modes</label>
                  <input
                    type="text"
                    value={transportModes}
                    onChange={(e) => setTransportModes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Assets */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Step 5: Allocate Operational Vehicles & Critical Assets ({assets.length} Assigned)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAssets([
                    ...assets,
                    {
                      name: `New Polar Asset ${assets.length + 1}`,
                      assetCode: `AST-0${assets.length + 1}`,
                      type: 'Snow Vehicle',
                      stationIndex: 0,
                      operatingHours: 0,
                      maintenanceInterval: 1000,
                      currentCondition: 'Good',
                    },
                  ])
                }
                className="flex items-center space-x-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Asset</span>
              </button>
            </div>

            <div className="space-y-3">
              {assets.map((asset, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-3.5 h-3.5 text-sky-600" />
                      <span className="text-xs font-mono font-bold text-sky-700">{asset.assetCode}</span>
                      <span className="text-xs font-bold text-slate-800">— {asset.name}</span>
                    </div>
                    {assets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAssets(assets.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Asset Name</label>
                      <input
                        type="text"
                        value={asset.name}
                        onChange={(e) => {
                          const updated = [...assets];
                          updated[idx].name = e.target.value;
                          setAssets(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Type</label>
                      <input
                        type="text"
                        value={asset.type}
                        onChange={(e) => {
                          const updated = [...assets];
                          updated[idx].type = e.target.value;
                          setAssets(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Station</label>
                      <select
                        value={asset.stationIndex}
                        onChange={(e) => {
                          const updated = [...assets];
                          updated[idx].stationIndex = parseInt(e.target.value, 10);
                          setAssets(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      >
                        {stations.map((s, sIdx) => (
                          <option key={sIdx} value={sIdx}>
                            {s.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Condition</label>
                      <select
                        value={asset.currentCondition}
                        onChange={(e) => {
                          const updated = [...assets];
                          updated[idx].currentCondition = e.target.value;
                          setAssets(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                      >
                        <option value="Optimal">Optimal</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Inspection Due">Inspection Due</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Cargo Manifests */}
        {step === 6 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Step 6: Plan & Dispatch Cargo Manifests ({cargo.length} Shipments)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCargo([
                    ...cargo,
                    {
                      cargoCode: `CRG-00${cargo.length + 1}`,
                      description: 'Specialized Scientific Sample Modules',
                      category: 'Scientific',
                      weightKg: 300,
                      quantity: 10,
                      priority: 'MEDIUM',
                      transportMode: 'Air',
                      eta: '2028-03-25',
                      specialRequirements: 'Shock Sensitive',
                    },
                  ])
                }
                className="flex items-center space-x-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cargo Shipment</span>
              </button>
            </div>

            <div className="space-y-3">
              {cargo.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="w-3.5 h-3.5 text-sky-600" />
                      <span className="text-xs font-mono font-bold text-sky-800">{item.cargoCode}</span>
                      <span className="text-xs font-bold text-slate-800">{item.description}</span>
                    </div>
                    {cargo.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCargo(cargo.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Category</label>
                      <select
                        value={item.category}
                        onChange={(e) => {
                          const updated = [...cargo];
                          updated[idx].category = e.target.value;
                          setCargo(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                      >
                        <option value="Fuel">Fuel</option>
                        <option value="Medicine">Medicine</option>
                        <option value="Food">Food</option>
                        <option value="Technical">Technical</option>
                        <option value="Scientific">Scientific</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Weight (kg)</label>
                      <input
                        type="number"
                        value={item.weightKg}
                        onChange={(e) => {
                          const updated = [...cargo];
                          updated[idx].weightKg = parseFloat(e.target.value) || 0;
                          setCargo(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Priority</label>
                      <select
                        value={item.priority}
                        onChange={(e) => {
                          const updated = [...cargo];
                          updated[idx].priority = e.target.value;
                          setCargo(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Transport Mode</label>
                      <select
                        value={item.transportMode}
                        onChange={(e) => {
                          const updated = [...cargo];
                          updated[idx].transportMode = e.target.value;
                          setCargo(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      >
                        <option value="Vessel">Vessel</option>
                        <option value="Air">Air</option>
                        <option value="Traverse">Traverse</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Estimated Arrival (ETA)</label>
                      <input
                        type="date"
                        value={item.eta}
                        onChange={(e) => {
                          const updated = [...cargo];
                          updated[idx].eta = e.target.value;
                          setCargo(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Special Handling / Hazards</label>
                    <input
                      type="text"
                      value={item.specialRequirements}
                      onChange={(e) => {
                        const updated = [...cargo];
                        updated[idx].specialRequirements = e.target.value;
                        setCargo(updated);
                      }}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Initial Operational Tasks */}
        {step === 7 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Step 7: Commission Initial Mission Operational Tasks ({tasks.length} Configured)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setTasks([
                    ...tasks,
                    {
                      title: `Mission Task ${tasks.length + 1}`,
                      description: 'Operational inspection and telemetry reporting.',
                      priority: 'MEDIUM',
                      location: 'Base Station Perimeter',
                      dueTime: '2028-03-20',
                      assignedCrewIndex: 0,
                    },
                  ])
                }
                className="flex items-center space-x-1 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            <div className="space-y-3">
              {tasks.map((task, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                      <span className="text-xs font-bold text-slate-900">Task #{idx + 1}</span>
                    </div>
                    {tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTasks(tasks.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Task Title *</label>
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => {
                          const updated = [...tasks];
                          updated[idx].title = e.target.value;
                          setTasks(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Assigned Field Crew Member</label>
                      <select
                        value={task.assignedCrewIndex}
                        onChange={(e) => {
                          const updated = [...tasks];
                          updated[idx].assignedCrewIndex = parseInt(e.target.value, 10);
                          setTasks(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-sky-800"
                      >
                        {crew.map((c, cIdx) => (
                          <option key={cIdx} value={cIdx}>
                            {c.name} ({c.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Priority</label>
                      <select
                        value={task.priority}
                        onChange={(e) => {
                          const updated = [...tasks];
                          updated[idx].priority = e.target.value;
                          setTasks(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Operational Location</label>
                      <input
                        type="text"
                        value={task.location}
                        onChange={(e) => {
                          const updated = [...tasks];
                          updated[idx].location = e.target.value;
                          setTasks(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Target Completion Due Date</label>
                      <input
                        type="date"
                        value={task.dueTime}
                        onChange={(e) => {
                          const updated = [...tasks];
                          updated[idx].dueTime = e.target.value;
                          setTasks(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Description / Protocol</label>
                    <input
                      type="text"
                      value={task.description}
                      onChange={(e) => {
                        const updated = [...tasks];
                        updated[idx].description = e.target.value;
                        setTasks(updated);
                      }}
                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 8: Review & Publish */}
        {step === 8 && (
          <div className="space-y-5 animate-in fade-in">
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
              <span>Step 8: Operational Readiness Review & Lifecycle Activation</span>
            </div>

            {/* Operational Readiness Gate Card */}
            <div className={`p-5 rounded-2xl border transition-all ${
              readiness.isReady
                ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
                : 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-200/60">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl text-white ${
                    readiness.isReady ? 'bg-emerald-600' : 'bg-rose-600 animate-pulse'
                  }`}>
                    {readiness.isReady ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                      Operational Readiness: {readiness.isReady ? 'READY TO DEPLOY' : 'NOT READY — DEPLOYMENT BLOCKED'}
                    </h3>
                    <p className="text-xs text-slate-600">
                      Calculated from live command, personnel roster, station bases, equipment, cargo, and safety workflows.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-semibold">Readiness Score:</span>
                  <span className={`px-3 py-1 rounded-xl text-xs font-mono font-black ${
                    readiness.score >= 80
                      ? 'bg-emerald-100 text-emerald-800'
                      : readiness.score >= 50
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {readiness.score} / 100
                  </span>
                </div>
              </div>

              {/* Blocking Issues Alert Box */}
              {readiness.blocking.length > 0 && (
                <div className="mt-4 p-3.5 bg-rose-100/80 border border-rose-300 rounded-xl space-y-1.5 text-xs text-rose-900">
                  <div className="font-bold flex items-center space-x-2 text-rose-800 uppercase tracking-wide text-[11px]">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Blocking Operational Issues (Must resolve before activation):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-rose-800">
                    {readiness.blocking.map((issue, idx) => (
                      <li key={idx} className="font-semibold">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings Box */}
              {readiness.warnings.length > 0 && (
                <div className="mt-3 p-3 bg-amber-100/70 border border-amber-300 rounded-xl space-y-1 text-xs text-amber-900">
                  <div className="font-bold flex items-center space-x-1.5 text-amber-800 text-[11px] uppercase tracking-wide">
                    <Flag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Advisory Warnings (Non-blocking):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-amber-800 text-[11px]">
                    {readiness.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subsystem Checklist Grid */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(readiness.subsystems).map(([sys, passed]) => (
                  <div
                    key={sys}
                    className={`flex items-center space-x-1.5 p-2 rounded-lg border ${
                      passed
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    )}
                    <span className="font-bold uppercase text-[10px] tracking-wider truncate">
                      {sys}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Mission Profile */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">{title}</span>
                  <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-mono font-bold">
                    {code}
                  </span>
                </div>
                <div className="text-xs text-slate-600">{missionObjective}</div>
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between">
                  <span>Priority: <strong className="text-rose-600">{priority}</strong></span>
                  <span>Window: {startDate} → {endDate}</span>
                </div>
              </div>

              {/* Card 2: Commander */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-slate-900">Assigned Commander</span>
                </div>
                <div className="text-sm font-extrabold text-slate-900">{commanderName}</div>
                <div className="text-xs text-slate-500 font-mono">{commanderEmail}</div>
                <div className="text-[11px] text-sky-700 font-semibold">Callsign: {commanderCallsign}</div>
              </div>

              {/* Card 3: Stations & Assets */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Stations ({stations.length}) & Assets ({assets.length})
                  </span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  {stations.map((s, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="font-semibold">{s.name} ({s.code})</span>
                      <span className="text-slate-500">Cap: {s.capacity}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                  {assets.map((a) => a.name).join(', ')}
                </div>
              </div>

              {/* Card 4: Crew & Tasks */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Assigned Crew ({crew.length}) & Tasks ({tasks.length})
                  </span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  {crew.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-slate-500">{c.role}</span>
                    </div>
                  ))}
                  {crew.length > 3 && (
                    <div className="text-[10px] text-slate-400 font-medium">
                      + {crew.length - 3} additional specialist personnel
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                  {tasks.length} initial operational tasks commissioned with responsible assignees.
                </div>
              </div>
            </div>

            {/* Publication Choice Callout */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs text-slate-700">
              <div className="font-bold flex items-center space-x-1.5 text-slate-900">
                <Compass className="w-4 h-4 text-sky-600" />
                <span>Operational Lifecycle Gate</span>
              </div>
              <p>
                In compliance with polar expedition safety protocols, saving in <strong>PLANNED</strong> state allows continued logistics staging without triggering live alarms. <strong>PUBLISHING (ACTIVE)</strong> initiates live Open-Meteo weather tracking, automated risk cascades, accountability intervals, and telemetry ingestion.
              </p>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Back to {stepNames[step - 2]}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {step < 8 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <span>Continue to {stepNames[step]}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCommission(false)}
                  className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  title="Save expedition in PLANNED state without activating live operational monitors"
                >
                  Save as Planned (DRAFT / PLANNED)
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !readiness.isReady}
                  onClick={() => handleCommission(true)}
                  className={`flex items-center space-x-2 px-6 py-2.5 text-white rounded-xl text-xs font-black transition shadow-sm ${
                    readiness.isReady
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      : 'bg-slate-400 cursor-not-allowed opacity-60'
                  } disabled:opacity-50`}
                  title={!readiness.isReady ? 'Cannot activate: Resolve blocking readiness issues first.' : 'Commission expedition and immediately transition to ACTIVE state'}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Commissioning...' : 'Publish & Activate Expedition'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

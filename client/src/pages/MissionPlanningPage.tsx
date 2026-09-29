import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  Users,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  ShieldCheck,
  Radio,
  FileText,
  Boxes,
} from 'lucide-react';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';

interface WaypointItem {
  id: string;
  name: string;
  activity: string;
  durationHours: number;
  assignedPersonnel: string[];
  equipmentRequired: string[];
  notes: string;
}

interface EquipmentAssignment {
  name: string;
  quantity: number;
  assignedTo: string;
  category: string;
}

export const MissionPlanningPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { currentExpedition } = useExpedition();
  const { isExpeditionLeader, isAdmin } = useAuth();

  // Lifecycle status
  const [missionStage, setMissionStage] = useState<string>('FIELD EXPEDITION');

  // Mission details
  const [missionName, setMissionName] = useState<string>(
    currentExpedition?.title || 'Amery Ice Shelf Survey'
  );
  const [departureDate, setDepartureDate] = useState<string>('12 January');
  const [returnDate, setReturnDate] = useState<string>('26 January');
  const [destinationRegion, setDestinationRegion] = useState<string>(
    'Amery Ice Shelf / Lambert Glacier Basin'
  );

  // Waypoints list
  const [waypoints, setWaypoints] = useState<WaypointItem[]>([
    {
      id: 'wp-1',
      name: 'Station Departure Point (Bharati Station)',
      activity: 'Pre-departure checklist, vehicle fuel-up, and satellite telemetry lock',
      durationHours: 2,
      assignedPersonnel: ['Dr. Rajesh Nair', 'Vikram Joshi'],
      equipmentRequired: ['Satellite Communicator', 'First Aid Kit'],
      notes: 'Final vehicle fuel-up and GPS beacon link test.',
    },
    {
      id: 'wp-2',
      name: 'Ice Core Survey Site A',
      activity: 'Firn core drilling & accumulation layer sampling',
      durationHours: 6,
      assignedPersonnel: ['Rahul Sharma', 'Dr. Ananya Singh'],
      equipmentRequired: ['Ice Drill', 'Core Containers', 'GPS Unit'],
      notes: 'Take 4-meter firn core samples and seal in insulated containers.',
    },
    {
      id: 'wp-3',
      name: 'Amery Shelf Transition Rim',
      activity: 'Ground Penetrating Radar (GPR) crevasse survey',
      durationHours: 5,
      assignedPersonnel: ['Rahul Sharma', 'Vikram Joshi'],
      equipmentRequired: ['Ground Penetrating Radar', 'Navigation GPS'],
      notes: 'Map subsurface crevasse fissures before convoy advances.',
    },
    {
      id: 'wp-4',
      name: 'Southern Return Point',
      activity: 'Sample consolidation and turnaround rendezvous',
      durationHours: 3,
      assignedPersonnel: ['Dr. Rajesh Nair', 'Rahul Sharma'],
      equipmentRequired: ['Thermal Freezers', 'Emergency Tent'],
      notes: 'Check-in with station watch officer via satellite.',
    },
  ]);

  // Equipment assignments
  const [equipmentList, setEquipmentList] = useState<EquipmentAssignment[]>([
    { name: 'Ice Drill (Mechanical Core)', quantity: 2, assignedTo: 'Rahul Sharma', category: 'Scientific' },
    { name: 'Satellite Communicator (Iridium)', quantity: 3, assignedTo: 'Dr. Rajesh Nair, Rahul Sharma, Vikram Joshi', category: 'Communications' },
    { name: 'Field Medical Kit', quantity: 2, assignedTo: 'Dr. Ananya Singh (Medical Officer)', category: 'Medical' },
    { name: 'Navigation GPS Handheld', quantity: 4, assignedTo: 'Field Traverse Team', category: 'Navigation' },
    { name: 'Ground Penetrating Radar', quantity: 1, assignedTo: 'Rahul Sharma', category: 'Scientific' },
    { name: 'Cold-Weather Survival Shelter', quantity: 2, assignedTo: 'Vikram Joshi', category: 'Safety' },
  ]);

  // Waypoint form state for adding new waypoint
  const [newWpName, setNewWpName] = useState<string>('');
  const [newWpActivity, setNewWpActivity] = useState<string>('');
  const [newWpDuration, setNewWpDuration] = useState<number>(4);
  const [isAddingWaypoint, setIsAddingWaypoint] = useState<boolean>(false);

  const handleAddWaypoint = () => {
    if (!newWpName.trim()) return;
    const newWp: WaypointItem = {
      id: `wp-${Date.now()}`,
      name: newWpName.trim(),
      activity: newWpActivity.trim() || 'Field scientific survey',
      durationHours: Number(newWpDuration) || 4,
      assignedPersonnel: ['Rahul Sharma'],
      equipmentRequired: ['Navigation GPS'],
      notes: 'Standard field survey procedure.',
    };
    setWaypoints([...waypoints, newWp]);
    setNewWpName('');
    setNewWpActivity('');
    setIsAddingWaypoint(false);
  };

  const handleDeleteWaypoint = (id: string) => {
    setWaypoints(waypoints.filter((w) => w.id !== id));
  };

  const handleMoveWaypoint = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= waypoints.length) return;
    const updated = [...waypoints];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setWaypoints(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Primary Action (Section BD) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Expedition Command & Lifecycle</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Mission Plan & Waypoints
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Define mission routes, waypoint activities, operational crew roles, and allocated equipment.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/live-map')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-xs"
          >
            <MapPin className="w-4 h-4" />
            <span>View on Live Map</span>
          </button>

          <button
            type="button"
            onClick={() => alert('Mission Plan changes saved successfully.')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Mission Plan</span>
          </button>
        </div>
      </div>

      {/* Expedition Readiness Widget (Section AJ) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Expedition Operational Readiness
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Review Required (1 Item)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 mb-0.5">Team Assigned</div>
            <div className="text-sm font-extrabold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 18 / 18
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 mb-0.5">Equipment</div>
            <div className="text-sm font-extrabold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 42 / 42 Allocated
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 mb-0.5">Critical Supplies</div>
            <div className="text-sm font-extrabold text-amber-700 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 1 Outstanding
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 mb-0.5">Requirements</div>
            <div className="text-sm font-extrabold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 mb-0.5">Cargo Consignment</div>
            <div className="text-sm font-extrabold text-amber-700 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 1 Delayed (Cape Town)
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-[11px] font-bold text-slate-500 mb-0.5">Safety & Tracking</div>
            <div className="text-sm font-extrabold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> GPS Active
            </div>
          </div>
        </div>
      </div>

      {/* Mission Lifecycle Stage Stepper (Section E) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Mission Lifecycle Phase
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {[
            'Planning',
            'Mission Preparation',
            'Team Assignment',
            'Equipment Allocation',
            'Station Departure',
            'Field Expedition',
            'Live Tracking',
            'Return / Debrief',
          ].map((step, idx) => {
            const isCompleted = idx <= 5;
            const isCurrent = step.toUpperCase() === missionStage.toUpperCase();

            return (
              <div
                key={step}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 ${
                  isCurrent
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span>{step}</span>
                {idx < 7 && <span className="text-slate-300 ml-1">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mission Parameters Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Mission Overview</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mission Name</label>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Destination / Region</label>
            <input
              type="text"
              value={destinationRegion}
              onChange={(e) => setDestinationRegion(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Departure Date</label>
            <input
              type="text"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Expected Return Date</label>
            <input
              type="text"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Planned Route & Waypoints (Section F & G) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Planned Route & Waypoint Activities</h2>
            <p className="text-xs text-slate-500">
              Ordered operational stops with defined tasks, durations, and personnel assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingWaypoint(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Waypoint</span>
          </button>
        </div>

        {/* Add Waypoint Modal Form */}
        {isAddingWaypoint && (
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
            <div className="font-bold text-xs text-blue-900">New Waypoint Definition</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Waypoint Name (e.g. Glacier Core Rim)"
                value={newWpName}
                onChange={(e) => setNewWpName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
              />
              <input
                type="text"
                placeholder="Activity (e.g. Ice sampling & radar scan)"
                value={newWpActivity}
                onChange={(e) => setNewWpActivity(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder="Duration (Hours)"
                value={newWpDuration}
                onChange={(e) => setNewWpDuration(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddingWaypoint(false)}
                className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWaypoint}
                className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
              >
                Confirm Add
              </button>
            </div>
          </div>
        )}

        {/* Waypoints List */}
        <div className="space-y-3">
          {waypoints.map((wp, idx) => (
            <div
              key={wp.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{wp.name}</div>
                    <div className="text-xs text-blue-700 font-medium">Activity: {wp.activity}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveWaypoint(idx, 'up')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === waypoints.length - 1}
                    onClick={() => handleMoveWaypoint(idx, 'down')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWaypoint(wp.id)}
                    className="p-1 rounded text-rose-400 hover:text-rose-700 cursor-pointer ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Waypoint metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200/70">
                <div>
                  <span className="text-slate-500 font-medium">Estimated Duration:</span>
                  <div className="font-bold text-slate-800">{wp.durationHours} Hours</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Assigned Personnel:</span>
                  <div className="font-semibold text-slate-800">
                    {wp.assignedPersonnel.join(', ')}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Required Equipment:</span>
                  <div className="font-semibold text-slate-800">
                    {wp.equipmentRequired.join(', ')}
                  </div>
                </div>
              </div>

              {wp.notes && (
                <div className="text-[11px] text-slate-500 italic">
                  Note: {wp.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Allocation Checklist (Section I) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Allocated Mission Equipment Checklist</h2>
            <p className="text-xs text-slate-500">
              Equipment assigned to team members for field execution.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {equipmentList.length} Categories Allocated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="pb-2.5">Equipment Name</th>
                <th className="pb-2.5">Category</th>
                <th className="pb-2.5">Quantity</th>
                <th className="pb-2.5">Assigned To</th>
                <th className="pb-2.5 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {equipmentList.map((eq, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-2.5 font-bold text-slate-900">{eq.name}</td>
                  <td className="py-2.5 text-slate-600">{eq.category}</td>
                  <td className="py-2.5 font-mono font-semibold text-slate-800">{eq.quantity} units</td>
                  <td className="py-2.5 text-slate-800">{eq.assignedTo}</td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Allocated
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

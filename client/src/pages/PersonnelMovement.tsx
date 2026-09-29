import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  MapPin,
  Clock,
  Radio,
  Battery,
  ShieldAlert,
  ArrowRight,
  Crosshair,
  Info,
  X,
  Plus,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Shield,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { Personnel } from '../types';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import {
  getExpeditionTrackedPersonnel,
  ExpeditionTrackedPerson,
} from '../services/expeditionService';
import { createPersonnel, fetchAllPersonnel } from '../services/api';
import { Modal } from '../components/common/Modal';

interface PersonnelMovementProps {
  personnelList?: Personnel[];
  onNavigate?: (path: string) => void;
  onRefreshData?: () => void;
}

export const PersonnelMovement: React.FC<PersonnelMovementProps> = ({
  personnelList = [],
  onNavigate,
  onRefreshData,
}) => {
  const {
    expeditions,
    currentExpeditionId,
    currentExpedition,
    switchExpedition,
    dashboard,
    triggerRefresh,
    isLoading: isExpLoading,
  } = useExpedition();

  const { isStationManager, isExpeditionLeader, currentUser, canEditOperationalData } = useAuth();

  // Primary toggle: Station Personnel vs Expedition Personnel (Section 10)
  const [personnelCategory, setPersonnelCategory] = useState<'STATION' | 'EXPEDITION'>(() => {
    return isStationManager ? 'STATION' : 'EXPEDITION';
  });

  // Expedition filtering within Expedition Personnel tab ('ALL' or specific expedition ID)
  const [selectedExpFilter, setSelectedExpFilter] = useState<string>('ALL');

  // Active expedition selector for telemetry / actions
  const [selectedExpId, setSelectedExpId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const expParam = urlParams.get('expedition');
    return (
      expParam ||
      localStorage.getItem('polar_active_expedition') ||
      currentExpeditionId ||
      expeditions[0]?.id ||
      ''
    );
  });

  // Station Staff live list
  const [stationStaffList, setStationStaffList] = useState<Personnel[]>([]);
  const [isLoadingStation, setIsLoadingStation] = useState(false);

  // Details Side Panel / Modal state
  const [selectedPersonnelDetails, setSelectedPersonnelDetails] =
    useState<ExpeditionTrackedPerson | null>(null);

  // Search & Role filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    role: 'Scientist',
    stationId: 'bharati',
    specialization: 'Polar Climatology',
    bloodType: 'O+',
    currentLocation: 'Base Camp',
  });

  // Load Station Staff from API
  useEffect(() => {
    let isMounted = true;
    setIsLoadingStation(true);
    fetchAllPersonnel()
      .then((data) => {
        if (isMounted) {
          if (data && data.length > 0) {
            setStationStaffList(data);
          } else if (personnelList && personnelList.length > 0) {
            setStationStaffList(personnelList);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load station staff:', err);
        if (isMounted && personnelList && personnelList.length > 0) {
          setStationStaffList(personnelList);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingStation(false);
      });

    return () => {
      isMounted = false;
    };
  }, [personnelList]);

  // Sync default category if user is Station Manager
  useEffect(() => {
    if (isStationManager) {
      setPersonnelCategory('STATION');
    }
  }, [isStationManager]);

  // Sync selected expedition from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const expParam = urlParams.get('expedition');
    if (expParam && expeditions.length > 0) {
      const match = expeditions.find(
        (e) =>
          e.id.toLowerCase() === expParam.toLowerCase() ||
          (e.code && e.code.toLowerCase() === expParam.toLowerCase()) ||
          e.title.toLowerCase().includes(expParam.toLowerCase())
      );
      if (match && match.id !== selectedExpId) {
        setSelectedExpId(match.id);
        localStorage.setItem('polar_active_expedition', match.id);
        switchExpedition(match.id);
        return;
      }
    }

    if (!selectedExpId && expeditions.length > 0) {
      const defaultId = currentExpeditionId || expeditions[0].id;
      setSelectedExpId(defaultId);
    }
  }, [expeditions, currentExpeditionId, selectedExpId, switchExpedition]);

  // Handle switching expedition
  const handleSelectExpedition = (expId: string) => {
    setSelectedExpId(expId);
    localStorage.setItem('polar_active_expedition', expId);
    switchExpedition(expId);
    setSelectedPersonnelDetails(null);
    const newUrl = `${window.location.pathname}?expedition=${encodeURIComponent(expId)}`;
    window.history.replaceState(null, '', newUrl);
  };

  // Find the selected active expedition object
  const activeExpedition = useMemo(() => {
    return (
      expeditions.find((e) => e.id === selectedExpId) ||
      currentExpedition ||
      expeditions[0] ||
      null
    );
  }, [expeditions, selectedExpId, currentExpedition]);

  // -------------------------------------------------------------
  // STATION PERSONNEL (Section 10: People working at the station)
  // -------------------------------------------------------------
  const stationStaff = useMemo(() => {
    const list = stationStaffList.length > 0 ? stationStaffList : personnelList;
    return list.filter((p) => {
      // Station staff: on base, at station, or explicitly assigned to station
      const isAtStation =
        p.status === 'At Station' ||
        p.status === 'On Base' ||
        p.currentLocation?.toLowerCase().includes('bharati') ||
        p.currentLocation?.toLowerCase().includes('station') ||
        Boolean(p.assignedStationId);
      return isAtStation;
    });
  }, [stationStaffList, personnelList]);

  // Filtered station personnel
  const filteredStationPersonnel = useMemo(() => {
    return stationStaff.filter((person) => {
      const matchesRole =
        selectedRole === 'All' ||
        person.role.toLowerCase().includes(selectedRole.toLowerCase()) ||
        (person.qualification && person.qualification.toLowerCase().includes(selectedRole.toLowerCase()));
      const matchesSearch =
        search.trim() === '' ||
        person.name.toLowerCase().includes(search.toLowerCase()) ||
        person.role.toLowerCase().includes(search.toLowerCase()) ||
        (person.qualification && person.qualification.toLowerCase().includes(search.toLowerCase())) ||
        (person.contactInfo && person.contactInfo.toLowerCase().includes(search.toLowerCase())) ||
        person.currentLocation.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [stationStaff, selectedRole, search]);

  // -------------------------------------------------------------
  // EXPEDITION PERSONNEL (Section 10: Participating in active expeditions)
  // -------------------------------------------------------------
  const expeditionPersonnelGroups = useMemo(() => {
    return expeditions.map((exp) => {
      const members = getExpeditionTrackedPersonnel(exp);
      const filteredMembers = members.filter((person) => {
        const matchesRole =
          selectedRole === 'All' ||
          person.role.toLowerCase().includes(selectedRole.toLowerCase());
        const matchesSearch =
          search.trim() === '' ||
          person.name.toLowerCase().includes(search.toLowerCase()) ||
          person.role.toLowerCase().includes(search.toLowerCase()) ||
          person.locationName.toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
      });

      return {
        expedition: exp,
        allMembers: members,
        filteredMembers,
      };
    });
  }, [expeditions, selectedRole, search]);

  const totalExpeditionPersonnelCount = useMemo(() => {
    return expeditions.reduce((acc, exp) => acc + getExpeditionTrackedPersonnel(exp).length, 0);
  }, [expeditions]);

  const stationRoles = [
    'All',
    'Station Manager',
    'Engineer',
    'Doctor',
    'Scientist',
    'Technician',
    'Logistics',
  ];

  const expeditionRoles = [
    'All',
    'Commander',
    'Scientist',
    'Navigator',
    'Engineer',
    'Specialist',
    'Doctor',
  ];

  // Navigate to Live Map focusing on this person
  const handleNavigateToLiveMap = (person: ExpeditionTrackedPerson) => {
    const targetExpId = activeExpedition?.id || person.expeditionId;
    const targetUrl = `/live-map?expedition=${encodeURIComponent(targetExpId)}&personnel=${encodeURIComponent(person.id)}`;
    if (onNavigate) {
      onNavigate(targetUrl);
    } else {
      window.location.href = targetUrl;
    }
  };

  // Open Details Modal for Station Personnel
  const handleViewStationPersonDetails = (person: Personnel) => {
    setSelectedPersonnelDetails({
      id: person.id,
      name: person.name,
      role: person.role,
      expeditionId: person.expeditionId || '',
      expeditionName: person.assignedStation?.name || 'Bharati Station Base Operations',
      stationName: person.assignedStation?.name || person.currentLocation || 'Bharati Station',
      locationName: person.currentLocation || 'Bharati Station Headquarters',
      latitude: person.latitude ?? -69.407,
      longitude: person.longitude ?? 76.191,
      elevationMeters: 35,
      battery: (person as any).batteryPercentage ?? 100,
      status: (person.status === 'Emergency' ? 'Emergency' : 'Connected') as any,
      lastUpdateSeconds: 15,
      lastUpdateText: 'Verified on Base',
      isEmergency: person.status === 'Emergency',
      contactFrequency: person.contactInfo || 'VHF Ch-16 Base Protocol',
      assignedEquipment: person.qualification ? [person.qualification] : ['Station Operational Facilities'],
    });
  };

  // Handle adding new member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExpedition?.id) return;
    try {
      setIsSubmitting(true);
      await createPersonnel(activeExpedition.id, {
        name: newMemberForm.name,
        role: newMemberForm.role,
        stationId: newMemberForm.stationId,
        specialization: newMemberForm.specialization,
        bloodType: newMemberForm.bloodType,
        status: 'On Base',
        currentLocation: newMemberForm.currentLocation,
        medicalClearance: 'Active',
      });
      setIsAddModalOpen(false);
      setNewMemberForm({
        name: '',
        role: 'Scientist',
        stationId: 'bharati',
        specialization: 'Polar Climatology',
        bloodType: 'O+',
        currentLocation: 'Base Camp',
      });
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to add personnel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER & SEGMENTED CONTROLS (Section 10)                  */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#0284C7] uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Personnel Roster & Operational Staff</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Personnel
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Manage station staff and track personnel participating in expeditions.
            </p>
          </div>

          {/* Segmented Control: [Station Personnel] [Expedition Personnel] */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setPersonnelCategory('STATION');
                setSelectedRole('All');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
                personnelCategory === 'STATION'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-[#0284C7]" />
              <span>Station Personnel</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  personnelCategory === 'STATION'
                    ? 'bg-sky-50 text-[#0284C7]'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {stationStaff.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPersonnelCategory('EXPEDITION');
                setSelectedRole('All');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-2 ${
                personnelCategory === 'EXPEDITION'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-4 h-4 text-[#0284C7]" />
              <span>Expedition Personnel</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  personnelCategory === 'EXPEDITION'
                    ? 'bg-sky-50 text-[#0284C7]'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {totalExpeditionPersonnelCount}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Context Summary Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            {personnelCategory === 'STATION' ? (
              <span className="text-slate-500 text-xs font-normal">
                Showing operational personnel stationed at{' '}
                <span className="font-semibold text-slate-800">
                  {currentUser?.stationId ? (currentUser.stationId.toUpperCase().includes('BHARATI') ? 'Bharati Station' : currentUser.stationId) : 'Bharati Station'}
                </span>
                {' • '}Manager: <span className="font-semibold text-slate-800">Dr. Rajesh Nair</span>
              </span>
            ) : (
              <span className="text-slate-500 text-xs font-normal">
                Showing field personnel assigned to active expeditions linked to station
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {personnelCategory === 'EXPEDITION' && canEditOperationalData && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0284C7] border border-sky-200 font-semibold transition cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Team Member</span>
              </button>
            )}

            {personnelCategory === 'EXPEDITION' && (
              <button
                type="button"
                onClick={() =>
                  onNavigate &&
                  onNavigate(
                    `/live-map?expedition=${encodeURIComponent(activeExpedition?.id || '')}`
                  )
                }
                className="px-3.5 py-1.5 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Open Expedition Live Map</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEARCH AND ROLE FILTER BAR                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              personnelCategory === 'STATION'
                ? 'Search station staff by name or role...'
                : 'Search expedition member by name or role...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
          />
        </div>

        {/* Expedition Selector (Only in Expedition Personnel tab) */}
        {personnelCategory === 'EXPEDITION' && expeditions.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Filter Expedition:
            </span>
            <select
              value={selectedExpFilter}
              onChange={(e) => setSelectedExpFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] cursor-pointer"
            >
              <option value="ALL">All Active Expeditions ({expeditions.length})</option>
              {expeditions.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Role Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs py-1">
          {(personnelCategory === 'STATION' ? stationRoles : expeditionRoles).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                selectedRole === r
                  ? 'bg-[#0284C7] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 font-medium'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. STATION PERSONNEL VIEW (Section 10)                        */}
      {/* ------------------------------------------------------------- */}
      {personnelCategory === 'STATION' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 uppercase tracking-wider">
                Station Personnel Roster
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Personnel currently assigned and operating on base at Bharati Station
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-[#0284C7] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
              {filteredStationPersonnel.length} / {stationStaff.length} On Base
            </span>
          </div>

          {filteredStationPersonnel.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2 font-normal">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-600">
                No station personnel found matching your criteria.
              </p>
              <p className="text-xs text-slate-400 font-normal">
                Try adjusting your search query or role filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStationPersonnel.map((person) => {
                const initials = person.name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const isManager = person.role.toLowerCase().includes('manager');

                return (
                  <div
                    key={person.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/80"
                  >
                    {/* Left: Avatar, Name, Role, Function */}
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isManager
                            ? 'bg-sky-100 text-[#0284C7] border border-sky-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                            {person.name}
                          </span>
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                          {isManager && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-[#0284C7] border border-sky-200">
                              Base Lead
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="font-semibold text-[#0284C7]">{person.role}</span>
                          {person.qualification && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-normal truncate max-w-md">
                                {person.qualification}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Operational & Contact Info */}
                    <div className="flex items-center space-x-6 sm:space-x-8 text-xs shrink-0">
                      <div className="hidden md:block text-right">
                        <span className="text-[11px] text-slate-400 block font-normal">
                          Operational Contact
                        </span>
                        <span className="font-medium text-slate-700 block">
                          {person.contactInfo || 'VHF Ch-16 / Internal'}
                        </span>
                      </div>

                      <div className="hidden lg:block text-right">
                        <span className="text-[11px] text-slate-400 block font-normal">
                          Base Location
                        </span>
                        <span className="font-medium text-slate-700 block">
                          {person.currentLocation || 'Bharati Station'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleViewStationPersonDetails(person)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                        title="View Personnel Details"
                      >
                        <Info className="w-3.5 h-3.5 text-slate-500" />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. EXPEDITION PERSONNEL VIEW (Section 10)                     */}
      {/* ------------------------------------------------------------- */}
      {personnelCategory === 'EXPEDITION' && (
        <div className="space-y-6">
          {expeditionPersonnelGroups
            .filter((group) => {
              if (selectedExpFilter === 'ALL') return true;
              return group.expedition.id === selectedExpFilter;
            })
            .map(({ expedition, filteredMembers, allMembers }) => (
              <div
                key={expedition.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                {/* Expedition Group Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                          {expedition.title}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                          {expedition.status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-normal">
                        Active Field Expedition Operating from Station
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-medium text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {filteredMembers.length} / {allMembers.length} Field Personnel
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate &&
                        onNavigate(`/live-map?expedition=${encodeURIComponent(expedition.id)}`)
                      }
                      className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0284C7] border border-sky-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Live Track</span>
                    </button>
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-1 font-normal">
                    <p className="text-xs font-medium text-slate-600">
                      No expedition personnel found matching current filters.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredMembers.map((person) => {
                      const isEmergency =
                        person.isEmergency || person.status === 'Emergency';
                      const isDelayed = person.status === 'Delayed';
                      const isOffline = person.status === 'Offline';

                      return (
                        <div
                          key={person.id}
                          className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/80 ${
                            isEmergency ? 'bg-rose-50/70 border-l-4 border-l-rose-600' : ''
                          }`}
                        >
                          {/* Member Info: Name — Role */}
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                                {person.name}
                              </span>

                              <span className="text-slate-400 text-xs font-medium">—</span>

                              <span className="font-semibold text-xs text-[#0284C7]">
                                {person.role}
                              </span>

                              <span
                                className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                                  isEmergency
                                    ? 'bg-rose-600 text-white animate-pulse shadow-xs'
                                    : isDelayed
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : isOffline
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isEmergency
                                      ? 'bg-white'
                                      : isDelayed
                                      ? 'bg-amber-500'
                                      : isOffline
                                      ? 'bg-slate-400'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                                <span>
                                  {isEmergency
                                    ? 'Emergency'
                                    : isDelayed
                                    ? 'Location Delayed'
                                    : isOffline
                                    ? 'Offline'
                                    : 'Connected'}
                                </span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="text-slate-600 flex items-center gap-1 font-normal">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-medium text-slate-700">
                                  {person.locationName}
                                </span>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-normal">
                                Telemetry: {person.lastUpdateText}
                              </span>
                            </div>
                          </div>

                          {/* Actions: View on Live Map & Details */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleNavigateToLiveMap(person)}
                              className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-[#0284C7] border border-sky-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                              title="Focus on Live Map"
                            >
                              <Crosshair className="w-3.5 h-3.5 text-[#0284C7]" />
                              <span>View on Live Map</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedPersonnelDetails(person)}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition flex items-center space-x-1 cursor-pointer"
                              title="View Personnel Details"
                            >
                              <Info className="w-3.5 h-3.5 text-slate-500" />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DEDICATED PERSONNEL DETAILS SIDE PANEL / MODAL                */}
      {/* ------------------------------------------------------------- */}
      {selectedPersonnelDetails && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 font-sans animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    Personnel Dossier
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-normal">
                    ID: {selectedPersonnelDetails.id}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
                  {selectedPersonnelDetails.name}
                </h3>
                <div className="text-xs font-medium text-[#0284C7] mt-0.5">
                  {selectedPersonnelDetails.role}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPersonnelDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Core Telemetry Overview Grid */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-medium block">
                  Assignment / Unit:
                </span>
                <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                  {selectedPersonnelDetails.expeditionName || activeExpedition?.title}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase font-medium block">
                  Current Status:
                </span>
                <div className="mt-0.5">
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      selectedPersonnelDetails.isEmergency
                        ? 'bg-rose-600 text-white'
                        : selectedPersonnelDetails.status === 'Delayed'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedPersonnelDetails.status === 'Offline'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <span>
                      {selectedPersonnelDetails.isEmergency
                        ? '🔴 Emergency'
                        : selectedPersonnelDetails.status === 'Delayed'
                        ? '🟡 Delayed'
                        : selectedPersonnelDetails.status === 'Offline'
                        ? '⚫ Offline'
                        : '🟢 Connected'}
                    </span>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase font-medium block">
                  Assigned Station Base:
                </span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {selectedPersonnelDetails.stationName}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase font-medium block">
                  Last Telemetry Ping:
                </span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {selectedPersonnelDetails.lastUpdateText}
                </span>
              </div>
            </div>

            {/* Emergency Alert Box (If Active) */}
            {selectedPersonnelDetails.isEmergency && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-1 text-xs">
                <div className="flex items-center space-x-1.5 text-rose-700 font-semibold uppercase text-[11px]">
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                  <span>Distress Signal Transmitted</span>
                </div>
                <p className="text-rose-900 font-normal">
                  {selectedPersonnelDetails.emergencyMessage ||
                    'Immediate assistance requested. Crevasse or ice traverse anomaly.'}
                </p>
              </div>
            )}

            {/* GPS & Field Location Details */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-400 font-medium uppercase text-[11px]">
                Current Location & Coordinates
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-[#0284C7]" />
                  <span>{selectedPersonnelDetails.locationName}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-600 pl-5 font-normal">
                  Latitude: {selectedPersonnelDetails.latitude.toFixed(4)}° S • Longitude:{' '}
                  {selectedPersonnelDetails.longitude.toFixed(4)}° E
                  {selectedPersonnelDetails.elevationMeters &&
                    ` • Elevation: ${selectedPersonnelDetails.elevationMeters}m`}
                </div>
              </div>
            </div>

            {/* Communications & Battery Status */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-medium block">
                  Comms Channel
                </span>
                <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  <span>
                    {selectedPersonnelDetails.contactFrequency || 'VHF Ch-16 Tactical'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-medium block">
                  Tracker Battery
                </span>
                <div className="flex items-center space-x-1.5 font-semibold">
                  <Battery
                    className={`w-4 h-4 ${
                      selectedPersonnelDetails.battery < 20
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  />
                  <span
                    className={
                      selectedPersonnelDetails.battery < 20
                        ? 'text-rose-600 font-semibold'
                        : 'text-slate-800 font-semibold'
                    }
                  >
                    {selectedPersonnelDetails.battery}% (Li-SOCl₂ Pack)
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Equipment / Function */}
            {selectedPersonnelDetails.assignedEquipment &&
              selectedPersonnelDetails.assignedEquipment.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-slate-400 font-medium uppercase text-[11px]">
                    Assigned Equipment & Facilities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPersonnelDetails.assignedEquipment.map((eq, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#0284C7] font-medium text-[11px] border border-sky-100"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Modal Actions */}
            <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  handleNavigateToLiveMap(selectedPersonnelDetails);
                  setSelectedPersonnelDetails(null);
                }}
                className="flex-1 py-2.5 bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Crosshair className="w-4 h-4" />
                <span>Locate on Live Map</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPersonnelDetails(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD MEMBER MODAL (FOR ADMIN OPERATION)                       */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add Team Member to ${activeExpedition?.title || 'Expedition'}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddMember} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Rajesh Sharma"
              value={newMemberForm.name}
              onChange={(e) =>
                setNewMemberForm({ ...newMemberForm, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Operational Role
              </label>
              <select
                value={newMemberForm.role}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, role: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                <option value="Scientist">Scientist</option>
                <option value="Engineer">Engineer</option>
                <option value="Commander">Commander</option>
                <option value="Doctor">Doctor</option>
                <option value="Technician">Technician</option>
                <option value="Logistics">Logistics</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Assigned Base Station
              </label>
              <select
                value={newMemberForm.stationId}
                onChange={(e) =>
                  setNewMemberForm({ ...newMemberForm, stationId: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                <option value="bharati">Bharati Station</option>
                <option value="maitri">Maitri Station</option>
                <option value="himadri">Himadri Station</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Field Specialization
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Atmospheric Physics / High-Altitude Medicine"
              value={newMemberForm.specialization}
              onChange={(e) =>
                setNewMemberForm({
                  ...newMemberForm,
                  specialization: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Initial Field Location
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bharati Station Staging Berth"
              value={newMemberForm.currentLocation}
              onChange={(e) =>
                setNewMemberForm({
                  ...newMemberForm,
                  currentLocation: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-normal focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white transition"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0284C7] hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Registering...' : 'Register Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

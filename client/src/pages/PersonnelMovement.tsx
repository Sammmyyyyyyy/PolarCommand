import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  Shield,
  Trash2,
  HeartPulse,
} from 'lucide-react';
import { Personnel } from '../types';
import { createPersonnel, updatePersonnel, deletePersonnel } from '../services/api';
import { useExpedition } from '../context/ExpeditionContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

interface PersonnelMovementProps {
  personnelList: Personnel[];
  onRefreshData?: () => void;
}

export const PersonnelMovement: React.FC<PersonnelMovementProps> = ({
  personnelList,
  onRefreshData,
}) => {
  const { currentExpeditionId, currentExpedition, dashboard, triggerRefresh } = useExpedition();
  const { canEditOperationalData } = useAuth();

  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Scientist',
    stationId: 'bharati',
    specialization: 'Glaciology & Ice Core Analytics',
    bloodType: 'O+',
    status: 'On Base',
    currentLocation: 'Bharati Station',
  });

  const availableStations = dashboard?.stationsSummary && dashboard.stationsSummary.length > 0
    ? dashboard.stationsSummary
    : [
        { id: 'bharati', name: 'Bharati Station' },
        { id: 'maitri', name: 'Maitri Station' },
      ];

  const roles = ['All', 'Scientist', 'Engineer', 'Doctor', 'Technician', 'Logistics', 'Commander'];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpeditionId) return;
    try {
      setIsSubmitting(true);
      await createPersonnel(currentExpeditionId, {
        name: formData.name,
        role: formData.role,
        stationId: formData.stationId,
        specialization: formData.specialization,
        bloodType: formData.bloodType,
        status: formData.status,
        currentLocation: formData.currentLocation || formData.stationId,
        medicalClearance: 'Active',
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        role: 'Scientist',
        stationId: availableStations[0]?.id || 'bharati',
        specialization: 'Glaciology & Ice Core Analytics',
        bloodType: 'O+',
        status: 'On Base',
        currentLocation: 'Bharati Station',
      });
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to add personnel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTransit = async (member: Personnel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentExpeditionId) return;
    try {
      const nextStatus = member.status === 'On Base' ? 'In Transit' : 'On Base';
      await updatePersonnel(currentExpeditionId, member.id, {
        status: nextStatus,
        currentLocation: nextStatus === 'In Transit' ? 'Overland Traverse Convoy' : member.stationId || 'Bharati Station',
      });
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update member status');
    }
  };

  const handleDelete = async (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentExpeditionId || !confirm(`Remove personnel member ${memberId}?`)) return;
    try {
      await deletePersonnel(currentExpeditionId, memberId);
      triggerRefresh();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete personnel');
    }
  };

  const filteredPersonnel = personnelList.filter((p) => {
    const matchesRole = selectedRole === 'All' || p.role.toLowerCase() === selectedRole.toLowerCase();
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.currentLocation.toLowerCase().includes(search.toLowerCase()) ||
      (p.specialization && p.specialization.toLowerCase().includes(search.toLowerCase()));
    return matchesRole && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header matching Screen 7 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Personnel Movement & Field Positioning
            </h1>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 font-mono">
              {personnelList.length} Expedition Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time on-ice safety tracking, transit flights, field mission coordinates, and medical availability for{' '}
            <strong className="text-slate-800">{currentExpedition?.code || 'Active Expedition'}</strong>
          </p>
        </div>

        {canEditOperationalData && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search member by name, ID, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white"
          />
        </div>

        {/* Role Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto text-xs py-1">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedRole === r
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Personnel Table matching Screen 7 */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Base Station</th>
                <th className="py-3 px-4">Current Coordinates / Location</th>
                <th className="py-3 px-4">Specialization</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Medical Clearance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No expedition personnel found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredPersonnel.map((person) => {
                  const isInTransit = person.status === 'In Transit';
                  const isDoctor = person.role.toLowerCase() === 'doctor';

                  return (
                    <tr key={person.id} className="hover:bg-sky-50/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{person.name}</span>
                          {isDoctor && <HeartPulse className="w-3.5 h-3.5 text-rose-500" />}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{person.id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{person.role}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {person.station?.name || person.stationId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-600" />
                          <span>{person.currentLocation}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {person.specialization || 'Polar Operations'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-700">
                        {person.bloodType || 'O+'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {person.medicalClearance || 'Cleared'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isInTransit
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {person.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        {canEditOperationalData && (
                          <button
                            onClick={(e) => handleToggleTransit(person, e)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700 transition"
                          >
                            {isInTransit ? 'Mark on Base' : 'Set In Transit'}
                          </button>
                        )}
                        {canEditOperationalData && (
                          <button
                            onClick={(e) => handleDelete(person.id, e)}
                            title="Remove Member"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Personnel Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Expedition Team Member"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Anita Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Operational Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                <option value="Scientist">Scientist</option>
                <option value="Engineer">Engineer</option>
                <option value="Doctor">Doctor</option>
                <option value="Technician">Technician</option>
                <option value="Logistics">Logistics</option>
                <option value="Commander">Commander</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Assigned Station</label>
              <select
                value={formData.stationId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stationId: e.target.value,
                    currentLocation: availableStations.find((s) => s.id === e.target.value)?.name || e.target.value,
                  })
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                {availableStations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Field Specialization</label>
            <input
              type="text"
              required
              placeholder="e.g. Atmospheric Physics / High-Altitude Medicine"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Blood Group</label>
              <select
                value={formData.bloodType}
                onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Current Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
              >
                <option value="On Base">On Base</option>
                <option value="In Transit">In Transit</option>
                <option value="Field Mission">Field Mission</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

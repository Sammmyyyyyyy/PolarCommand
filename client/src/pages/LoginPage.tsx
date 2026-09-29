import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  Mountain,
  Users,
  Truck,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  MapPin,
  ChevronDown,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PrimaryRole } from '../types';
import { fetchPublicStations } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (role: PrimaryRole) => void;
  onNavigateHome?: () => void;
  onNavigate?: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome,
  onNavigate,
}) => {
  const { login } = useAuth();

  // Five system roles as specified
  const [selectedRole, setSelectedRole] = useState<PrimaryRole>('ADMIN');

  // Dynamic credentials per role
  const [adminId, setAdminId] = useState<string>('ADM-001');
  const [stationName, setStationName] = useState<string>('Bharati Station');
  const [stationManagerId, setStationManagerId] = useState<string>('SM-BHARATI-01');
  const [expeditionLeaderId, setExpeditionLeaderId] = useState<string>('EL-001');
  const [memberId, setMemberId] = useState<string>('TM-1029');
  const [logisticsCommanderId, setLogisticsCommanderId] = useState<string>('LC-001');

  const [password, setPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available station options loaded dynamically from backend
  const [stationOptions, setStationOptions] = useState<Array<{ id: string; name: string }>>([
    { id: 'maitri', name: 'Maitri Station' },
    { id: 'bharati', name: 'Bharati Station' },
    { id: 'himadri', name: 'Himadri Polar Research Base' },
  ]);

  useEffect(() => {
    async function loadStations() {
      try {
        const stations = await fetchPublicStations();
        if (stations && stations.length > 0) {
          // Unique station names
          const uniqueNames = Array.from(new Set(stations.map((s) => s.name)));
          setStationOptions(uniqueNames.map((name) => ({ id: name, name })));
        }
      } catch (err) {
        console.warn('Could not load station list, using defaults:', err);
      }
    }
    loadStations();
  }, []);

  // Update default station manager ID when station changes
  const handleStationChange = (name: string) => {
    setStationName(name);
    if (name.toLowerCase().includes('bharati')) {
      setStationManagerId('SM-BHARATI-01');
    } else if (name.toLowerCase().includes('himadri')) {
      setStationManagerId('SM-HIMADRI-01');
    } else {
      setStationManagerId('SM-MAITRI-01');
    }
  };

  const handleRoleSelect = (role: PrimaryRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
    if (role === 'ADMIN') {
      if (!adminId) setAdminId('ADM-001');
    } else if (role === 'STATION_MANAGER') {
      if (!stationManagerId) setStationManagerId('SM-BHARATI-01');
    } else if (role === 'EXPEDITION_LEADER') {
      if (!expeditionLeaderId) setExpeditionLeaderId('EL-001');
    } else if (role === 'TEAM_MEMBER') {
      if (!memberId) setMemberId('TM-1029');
    } else if (role === 'LOGISTICS_COMMANDER') {
      if (!logisticsCommanderId) setLogisticsCommanderId('LC-001');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    let identifier = '';
    if (selectedRole === 'ADMIN') {
      identifier = adminId.trim();
      if (!identifier) {
        setErrorMsg('Please enter your Admin ID.');
        setIsLoading(false);
        return;
      }
    } else if (selectedRole === 'STATION_MANAGER') {
      identifier = stationManagerId.trim();
      if (!identifier) {
        setErrorMsg('Please enter your Station Manager ID.');
        setIsLoading(false);
        return;
      }
    } else if (selectedRole === 'EXPEDITION_LEADER') {
      identifier = expeditionLeaderId.trim();
      if (!identifier) {
        setErrorMsg('Please enter your Expedition Leader ID.');
        setIsLoading(false);
        return;
      }
    } else if (selectedRole === 'TEAM_MEMBER') {
      identifier = memberId.trim();
      if (!identifier) {
        setErrorMsg('Please enter your Member ID.');
        setIsLoading(false);
        return;
      }
    } else if (selectedRole === 'LOGISTICS_COMMANDER') {
      identifier = logisticsCommanderId.trim();
      if (!identifier) {
        setErrorMsg('Please enter your Logistics Commander ID.');
        setIsLoading(false);
        return;
      }
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      setIsLoading(false);
      return;
    }

    try {
      // Authoritative backend verification determines user session & verified role
      const user = await login({
        identifier,
        adminId: selectedRole === 'ADMIN' ? identifier : undefined,
        stationManagerId: selectedRole === 'STATION_MANAGER' ? identifier : undefined,
        expeditionLeaderId: selectedRole === 'EXPEDITION_LEADER' ? identifier : undefined,
        memberId: selectedRole === 'TEAM_MEMBER' ? identifier : undefined,
        logisticsCommanderId: selectedRole === 'LOGISTICS_COMMANDER' ? identifier : undefined,
        password,
        role: selectedRole,
        stationName: selectedRole === 'STATION_MANAGER' ? stationName : undefined,
      });

      const verifiedRole = (user.role as PrimaryRole) || selectedRole;
      onLoginSuccess(verifiedRole);
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Authentication failed. Please verify your credentials and security passcode.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnHome = () => {
    if (onNavigateHome) onNavigateHome();
    else if (onNavigate) onNavigate('/');
  };

  return (
    <div
      className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden select-none bg-[#F2F7FC]"
      style={{
        backgroundImage: `url('/images/login-bg-standalone.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Top Header Overlay Bar */}
      <header className="w-full px-6 sm:px-10 py-5 flex items-center justify-between z-10">
        <div
          onClick={handleReturnHome}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          {/* PolarCommand Tri-Peak Mountain Mark */}
          <div className="text-[#0284C7] group-hover:text-blue-700 transition">
            <svg
              className="w-8 h-8"
              viewBox="0 0 40 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 28L14 8L20 18L26 6L36 28H4Z"
                stroke="#0284C7"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base tracking-widest text-[#0A192F] leading-tight">
              POLAR COMMAND
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-[0.16em] font-medium text-slate-500 uppercase">
              Expedition Command & Operations Platform
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="font-mono text-slate-500 font-semibold tracking-wider">v2.6.1</span>
          <span className="text-slate-300">|</span>
          <button
            onClick={handleReturnHome}
            className="text-[11px] font-semibold text-slate-600 hover:text-blue-700 transition"
          >
            Public Portal
          </button>
        </div>
      </header>

      {/* Main Centered Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto z-10">
        <div className="w-full max-w-[560px] bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-blue-950/10 p-7 sm:p-10 space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-1.5">
            <div className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase">
              WELCOME TO
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A192F] tracking-tight">
              POLAR COMMAND
            </h1>
            <div className="w-10 h-0.5 bg-[#0284C7] mx-auto rounded-full my-2"></div>
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              EXPEDITION COMMAND & OPERATIONS PLATFORM
            </div>
          </div>

          {/* Role Selector Section */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-[#0A192F] text-left">
              Select Your Role
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
              {/* Role 1: Admin */}
              <button
                type="button"
                onClick={() => handleRoleSelect('ADMIN')}
                className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border transition cursor-pointer text-center ${
                  selectedRole === 'ADMIN'
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E3A8A] font-bold shadow-2xs ring-1 ring-[#2563EB]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <Shield
                  className={`w-5 h-5 mb-1.5 ${
                    selectedRole === 'ADMIN' ? 'text-[#2563EB]' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-semibold leading-tight">Admin</span>
              </button>

              {/* Role 2: Station Manager */}
              <button
                type="button"
                onClick={() => handleRoleSelect('STATION_MANAGER')}
                className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border transition cursor-pointer text-center ${
                  selectedRole === 'STATION_MANAGER'
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E3A8A] font-bold shadow-2xs ring-1 ring-[#2563EB]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <Building2
                  className={`w-5 h-5 mb-1.5 ${
                    selectedRole === 'STATION_MANAGER' ? 'text-[#2563EB]' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-semibold leading-tight">
                  Station Manager
                </span>
              </button>

              {/* Role 3: Expedition Leader */}
              <button
                type="button"
                onClick={() => handleRoleSelect('EXPEDITION_LEADER')}
                className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border transition cursor-pointer text-center ${
                  selectedRole === 'EXPEDITION_LEADER'
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E3A8A] font-bold shadow-2xs ring-1 ring-[#2563EB]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <Mountain
                  className={`w-5 h-5 mb-1.5 ${
                    selectedRole === 'EXPEDITION_LEADER' ? 'text-[#2563EB]' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-semibold leading-tight">
                  Expedition Leader
                </span>
              </button>

              {/* Role 4: Team Member */}
              <button
                type="button"
                onClick={() => handleRoleSelect('TEAM_MEMBER')}
                className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border transition cursor-pointer text-center ${
                  selectedRole === 'TEAM_MEMBER'
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E3A8A] font-bold shadow-2xs ring-1 ring-[#2563EB]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <Users
                  className={`w-5 h-5 mb-1.5 ${
                    selectedRole === 'TEAM_MEMBER' ? 'text-[#2563EB]' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-semibold leading-tight">
                  Team Member
                </span>
              </button>

              {/* Role 5: Logistics Commander */}
              <button
                type="button"
                onClick={() => handleRoleSelect('LOGISTICS_COMMANDER')}
                className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-xl border transition cursor-pointer text-center ${
                  selectedRole === 'LOGISTICS_COMMANDER'
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E3A8A] font-bold shadow-2xs ring-1 ring-[#2563EB]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <Truck
                  className={`w-5 h-5 mb-1.5 ${
                    selectedRole === 'LOGISTICS_COMMANDER' ? 'text-[#2563EB]' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-semibold leading-tight">
                  Logistics Commander
                </span>
              </button>
            </div>
          </div>

          {/* Dynamic Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* DYNAMIC FIELD 1: ROLE-SPECIFIC CREDENTIALS */}
            {selectedRole === 'ADMIN' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
                  Admin ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="Enter Admin ID"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition shadow-2xs"
                    required
                  />
                </div>
              </div>
            )}

            {selectedRole === 'STATION_MANAGER' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
                    Station Name
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={stationName}
                      onChange={(e) => handleStationChange(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition shadow-2xs appearance-none cursor-pointer"
                      required
                    >
                      {stationOptions.map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
                    Station Manager ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={stationManagerId}
                      onChange={(e) => setStationManagerId(e.target.value)}
                      placeholder="Enter Station Manager ID"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition shadow-2xs"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {selectedRole === 'EXPEDITION_LEADER' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
                  Expedition Leader ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={expeditionLeaderId}
                    onChange={(e) => setExpeditionLeaderId(e.target.value)}
                    placeholder="Enter Expedition Leader ID"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition shadow-2xs"
                    required
                  />
                </div>
              </div>
            )}

            {selectedRole === 'TEAM_MEMBER' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
                  Member ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="Enter Member ID"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition shadow-2xs"
                    required
                  />
                </div>
              </div>
            )}

            {selectedRole === 'LOGISTICS_COMMANDER' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
                  Logistics Commander ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logisticsCommanderId}
                    onChange={(e) => setLogisticsCommanderId(e.target.value)}
                    placeholder="Enter Logistics Commander ID"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition shadow-2xs"
                    required
                  />
                </div>
              </div>
            )}

            {/* DYNAMIC FIELD 2: PASSWORD */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 text-left">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition shadow-2xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-bold text-xs tracking-wide shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>

            {/* FOOTER INDICATOR: SECURE SESSION */}
            <div className="pt-2 flex items-center justify-center space-x-2 text-[10px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Secure Session • RBAC Enforced • PolarCommand Network</span>
            </div>
          </form>
        </div>
      </main>

      {/* Subtle Bottom Footer */}
      <footer className="w-full py-4 px-6 text-center text-[11px] text-slate-500 z-10">
        PolarCommand Operations Engine • National Antarctic Expedition Operations & Mission Telemetry
      </footer>
    </div>
  );
};

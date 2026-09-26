import React, { useState } from 'react';
import {
  Shield,
  Building2,
  Compass,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  Radio,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PrimaryRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (role: PrimaryRole) => void;
  onNavigateHome?: () => void;
  onNavigate?: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateHome, onNavigate }) => {
  const { login } = useAuth();

  const [selectedRoleHint, setSelectedRoleHint] = useState<PrimaryRole>('ADMIN');
  const [email, setEmail] = useState<string>('admin@polarcommand.org');
  const [password, setPassword] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const roleProfiles: Array<{
    role: PrimaryRole;
    title: string;
    description: string;
    defaultEmail: string;
    icon: React.ElementType;
    badgeColor: string;
    assignedScope: string;
  }> = [
    {
      role: 'ADMIN',
      title: 'Admin',
      description: 'Global polar command, expedition creation, all stations & inventory cargo.',
      defaultEmail: 'admin@polarcommand.org',
      icon: Shield,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      assignedScope: 'Global Antarctica Operations',
    },
    {
      role: 'STATION_MANAGER',
      title: 'Station Manager',
      description: 'Maitri Base inventory, stockout alerts, restock requests, and local logistics.',
      defaultEmail: 'maitri.manager@polarcommand.org',
      icon: Building2,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      assignedScope: 'Maitri Research Station',
    },
    {
      role: 'EXPEDITION_LEADER',
      title: 'Expedition Leader',
      description: '44th IAE traverse, team oversight, equipment assignment & cargo status.',
      defaultEmail: 'leader@polarcommand.org',
      icon: Compass,
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      assignedScope: '44th Indian Antarctic Expedition',
    },
    {
      role: 'TEAM_MEMBER',
      title: 'Team Member',
      description: 'Field tasks, personal equipment, peer locations map & emergency SOS reporting.',
      defaultEmail: 'member@polarcommand.org',
      icon: UserCheck,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      assignedScope: 'Field Member • Dr. Rahul Sharma',
    },
  ];

  const handleSelectRoleHint = (p: (typeof roleProfiles)[0]) => {
    setSelectedRoleHint(p.role);
    setEmail(p.defaultEmail);
    setPassword('password123');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Backend authentication determines the actual authoritative role & permissions!
      const user = await login(email, password);
      const actualRole = (user.role as PrimaryRole) || 'TEAM_MEMBER';
      onLoginSuccess(actualRole);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-[#EAF5FF] via-[#F1F8FF] to-[#E3F0FC] text-slate-800 font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-sky-100/60 bg-white/70 backdrop-blur-md">
        <button
          onClick={onNavigateHome}
          className="flex items-center space-x-3 text-left focus:outline-hidden group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200 group-hover:bg-blue-700 transition">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-black text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
              POLAR COMMAND
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                v2.6
              </span>
            </div>
            <div className="text-[10px] text-blue-700 font-medium tracking-wide">
              EXPEDITION COMMAND & OPERATIONS PLATFORM
            </div>
          </div>
        </button>

        <button
          onClick={onNavigateHome}
          className="text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition"
        >
          ← Return to Public Portal
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-sky-900/5 border border-sky-100 p-6 sm:p-8 space-y-6">
          {/* Header Title */}
          <div className="text-center max-w-lg mx-auto space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Role-Aware Secure Command Authentication</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Mission Control Authorization
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Select your operational assignment or enter authenticated mission credentials below.
            </p>
          </div>

          {/* Role Profiles Selector Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-semibold text-slate-700">Quick Mission Profile Selector:</span>
              <span className="text-[11px] text-slate-400">Clicking loads certified test profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {roleProfiles.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedRoleHint === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleSelectRoleHint(p)}
                    className={`text-left p-3.5 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                        {p.title}
                      </span>
                    </div>

                    <div className="font-bold text-xs text-slate-900">{p.title}</div>
                    <div className="text-[11px] text-slate-500 leading-snug line-clamp-2 mt-1">
                      {p.description}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-500 truncate">
                      {p.defaultEmail}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4 pt-2">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mission Credentials (Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@polarcommand.org"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Security Access Passcode
                </label>
                <span className="text-[11px] text-blue-600 font-medium">Default: password123</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating with Mission Control...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Command Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Authoritative Role Disclaimer Alert */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-700">Authoritative Security Architecture: </span>
                User role and resource scopes are authenticated and enforced strictly by the backend server.
                Frontend role selector is a convenient profile loader; backend verification guarantees genuine RBAC access control.
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3 px-6 text-center text-xs text-slate-400 border-t border-sky-100/60 bg-white/40">
        PolarCommand Operations Engine • National Antarctic Expedition Operations & Mission Telemetry
      </footer>
    </div>
  );
};

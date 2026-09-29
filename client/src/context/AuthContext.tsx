import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Permission, PrimaryRole } from '../types';
import { fetchCurrentUser, loginUser, LoginPayload } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: PrimaryRole;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: string | LoginPayload, password?: string) => Promise<User>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  canCreateExpedition: boolean;
  isAdmin: boolean;
  isStationManager: boolean;
  isExpeditionLeader: boolean;
  isTeamMember: boolean;
  isLogisticsCommander: boolean;
  canRaiseRequirements: boolean;
  canExecuteActions: boolean;
  canEditOperationalData: boolean;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function normalizeFrontendRole(rawRole?: string): PrimaryRole {
  if (!rawRole) return 'TEAM_MEMBER';
  const upper = rawRole.toUpperCase().trim();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'STATION_MANAGER' || upper === 'STATION') return 'STATION_MANAGER';
  if (upper === 'EXPEDITION_LEADER' || upper === 'COMMANDER' || upper === 'LEADER') return 'EXPEDITION_LEADER';
  if (upper === 'LOGISTICS_COMMANDER' || upper === 'LOGISTICS' || upper === 'LOGISTICS_OFFICER') return 'LOGISTICS_COMMANDER';
  if (upper === 'TEAM_MEMBER' || upper === 'FIELD_MEMBER' || upper === 'MEMBER' || upper === 'VIEWER') return 'TEAM_MEMBER';
  return 'TEAM_MEMBER';
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('polar_auth_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(localStorage.getItem('polar_auth_token'));
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const currentRole: PrimaryRole = normalizeFrontendRole(currentUser?.role);
  const isAuthenticated = !!currentUser && !!token;

  useEffect(() => {
    async function loadUser() {
      setIsLoadingAuth(true);
      try {
        const storedToken = localStorage.getItem('polar_auth_token');
        if (storedToken) {
          const res = await fetchCurrentUser();
          if (res?.user) {
            setCurrentUser(res.user);
            localStorage.setItem('polar_auth_user', JSON.stringify(res.user));
          } else {
            // Session expired or invalid
            localStorage.removeItem('polar_auth_token');
            localStorage.removeItem('polar_auth_user');
            setCurrentUser(null);
            setToken(null);
          }
        } else {
          // No stored session - user is not authenticated
          setCurrentUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Failed to verify session with backend:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }
    loadUser();
  }, []);

  const login = async (credentials: string | LoginPayload, password?: string): Promise<User> => {
    const res = await loginUser(credentials, password);
    setToken(res.token);
    setCurrentUser(res.user);
    localStorage.setItem('polar_auth_token', res.token);
    localStorage.setItem('polar_auth_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('polar_auth_token');
    localStorage.removeItem('polar_auth_user');
    setToken(null);
    setCurrentUser(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    if (currentRole === 'ADMIN') return true;
    if (currentUser.permissions && Array.isArray(currentUser.permissions)) {
      return currentUser.permissions.includes(permission);
    }
    return false;
  };

  // Strictly enforced RBAC capabilities based on authenticated session
  const canCreateExpedition = currentRole === 'ADMIN' && hasPermission('expedition:create');
  const isAdmin = currentRole === 'ADMIN';
  const isStationManager = currentRole === 'STATION_MANAGER';
  const isExpeditionLeader = currentRole === 'EXPEDITION_LEADER';
  const isTeamMember = currentRole === 'TEAM_MEMBER';
  const isLogisticsCommander = currentRole === 'LOGISTICS_COMMANDER';
  const canRaiseRequirements = isStationManager || isLogisticsCommander || isExpeditionLeader;
  const canExecuteActions = isAdmin || isExpeditionLeader;
  const canEditOperationalData = isAdmin || isStationManager || isExpeditionLeader || isLogisticsCommander;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        token,
        isAuthenticated,
        login,
        logout,
        hasPermission,
        canCreateExpedition,
        isAdmin,
        isStationManager,
        isExpeditionLeader,
        isTeamMember,
        isLogisticsCommander,
        canRaiseRequirements,
        canExecuteActions,
        canEditOperationalData,
        isLoadingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

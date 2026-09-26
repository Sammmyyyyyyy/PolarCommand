import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Permission, PrimaryRole } from '../types';
import { fetchCurrentUser, loginUser } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: PrimaryRole;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  canCreateExpedition: boolean;
  isAdmin: boolean;
  isStationManager: boolean;
  isExpeditionLeader: boolean;
  isTeamMember: boolean;
  canExecuteActions: boolean;
  canEditOperationalData: boolean;
  switchRole: (role: any) => Promise<void>;
  quickSwitchRoleLogin: (role: PrimaryRole) => Promise<void>;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function normalizeFrontendRole(rawRole?: string): PrimaryRole {
  if (!rawRole) return 'ADMIN';
  const upper = rawRole.toUpperCase().trim();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'STATION_MANAGER' || upper === 'STATION') return 'STATION_MANAGER';
  if (upper === 'EXPEDITION_LEADER' || upper === 'COMMANDER' || upper === 'LEADER') return 'EXPEDITION_LEADER';
  if (upper === 'TEAM_MEMBER' || upper === 'FIELD_MEMBER' || upper === 'MEMBER' || upper === 'VIEWER') return 'TEAM_MEMBER';
  return 'TEAM_MEMBER';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('polar_auth_token'));
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const currentRole: PrimaryRole = normalizeFrontendRole(currentUser?.role);

  useEffect(() => {
    async function loadUser() {
      setIsLoadingAuth(true);
      try {
        const storedToken = localStorage.getItem('polar_auth_token');
        if (storedToken) {
          const res = await fetchCurrentUser();
          if (res?.user) {
            setCurrentUser(res.user);
            setIsLoadingAuth(false);
            return;
          }
        }

        // Auto login with default administrator so initial load is ready
        try {
          const defaultLogin = await loginUser('admin@polarcommand.org', 'password123');
          setToken(defaultLogin.token);
          setCurrentUser(defaultLogin.user);
        } catch {
          // Fallback admin
          setCurrentUser({
            id: 'admin-fallback',
            email: 'admin@polarcommand.org',
            name: 'Samyak Trivedi',
            role: 'ADMIN',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Failed to fetch current user session:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await loginUser(email, password);
    setToken(res.token);
    setCurrentUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('polar_auth_token');
    setToken(null);
    setCurrentUser(null);
  };

  /**
   * Helper for quick authentic backend login for demo & testing:
   * Calls the real backend /api/auth/login with actual credentials
   * so the backend verifies credentials, determines actual role & issues valid JWT!
   */
  const quickSwitchRoleLogin = async (targetRole: PrimaryRole) => {
    let email = 'admin@polarcommand.org';
    if (targetRole === 'STATION_MANAGER') {
      email = 'maitri.manager@polarcommand.org';
    } else if (targetRole === 'EXPEDITION_LEADER') {
      email = 'leader@polarcommand.org';
    } else if (targetRole === 'TEAM_MEMBER') {
      email = 'member@polarcommand.org';
    }

    try {
      await login(email, 'password123');
    } catch (err) {
      console.error(`Quick switch login failed for ${targetRole}:`, err);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    if (currentRole === 'ADMIN') return true;
    if (currentUser.permissions && Array.isArray(currentUser.permissions)) {
      return currentUser.permissions.includes(permission);
    }
    return false;
  };

  // ONLY ADMIN can create an expedition - strict enforcement
  const canCreateExpedition = currentRole === 'ADMIN' && hasPermission('expedition:create');
  const isAdmin = currentRole === 'ADMIN';
  const isStationManager = currentRole === 'STATION_MANAGER';
  const isExpeditionLeader = currentRole === 'EXPEDITION_LEADER';
  const isTeamMember = currentRole === 'TEAM_MEMBER';
  const canExecuteActions = isAdmin || isExpeditionLeader;
  const canEditOperationalData = isAdmin || isStationManager || isExpeditionLeader;

  const switchRole = async (r: any) => {
    await quickSwitchRoleLogin(normalizeFrontendRole(r));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        token,
        login,
        logout,
        hasPermission,
        canCreateExpedition,
        isAdmin,
        isStationManager,
        isExpeditionLeader,
        isTeamMember,
        canExecuteActions,
        canEditOperationalData,
        switchRole,
        quickSwitchRoleLogin,
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

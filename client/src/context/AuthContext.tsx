import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { fetchCurrentUser, loginUser } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  canExecuteActions: boolean;
  canEditOperationalData: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('COMMANDER');
  const [token, setToken] = useState<string | null>(localStorage.getItem('polar_auth_token'));

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetchCurrentUser();
        if (res?.user) {
          setCurrentUser(res.user);
          setCurrentRole(res.user.role);
        } else {
          // Default guest commander profile
          setCurrentUser({
            id: 'commander-guest-id',
            email: 'commander@polarcommand.org',
            name: 'Dr. Rajesh Nair (Commander)',
            role: 'COMMANDER',
            createdAt: new Date().toISOString(),
          });
          setCurrentRole('COMMANDER');
        }
      } catch {
        setCurrentUser({
          id: 'commander-guest-id',
          email: 'commander@polarcommand.org',
          name: 'Dr. Rajesh Nair (Commander)',
          role: 'COMMANDER',
          createdAt: new Date().toISOString(),
        });
        setCurrentRole('COMMANDER');
      }
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await loginUser(email, password);
    setToken(res.token);
    setCurrentUser(res.user);
    setCurrentRole(res.user.role);
  };

  const logout = () => {
    localStorage.removeItem('polar_auth_token');
    setToken(null);
    setCurrentUser(null);
    setCurrentRole('VIEWER');
  };

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    if (currentUser) {
      setCurrentUser({ ...currentUser, role });
    }
  };

  const canExecuteActions = currentRole === 'ADMIN' || currentRole === 'COMMANDER';
  const canEditOperationalData =
    currentRole === 'ADMIN' || currentRole === 'COMMANDER' || currentRole === 'LOGISTICS_OFFICER' || currentRole === 'STATION_MANAGER';
  const isAdmin = currentRole === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        token,
        login,
        logout,
        switchRole,
        canExecuteActions,
        canEditOperationalData,
        isAdmin,
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

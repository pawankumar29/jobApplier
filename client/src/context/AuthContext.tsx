import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import { User, Profile, JobPreference, AutomationConfig, IntegrationAccount } from '../types/index.js';

interface AuthContextType {
  token: string | null;
  user: User | null;
  profile: Profile | null;
  preferences: JobPreference | null;
  integrations: IntegrationAccount[];
  automationConfig: AutomationConfig | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('autojob_token'));
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<JobPreference | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationAccount[]>([]);
  const [automationConfig, setAutomationConfig] = useState<AutomationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        setProfile(res.data.user.profile);
        setPreferences(res.data.user.preferences);
        setIntegrations(res.data.user.integrations || []);
        setAutomationConfig(res.data.user.automationConfig);
      }
    } catch (err) {
      // Invalid or expired token
      localStorage.removeItem('autojob_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('autojob_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        setProfile(res.data.user.profile);
        setPreferences(res.data.user.preferences);
        setAutomationConfig(res.data.user.automationConfig);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await apiClient.post('/auth/register', { name, email, password });
      if (res.data.success) {
        localStorage.setItem('autojob_token', res.data.token);
        setToken(res.data.token);
        await fetchCurrentUser();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('autojob_token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setPreferences(null);
    setIntegrations([]);
    setAutomationConfig(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        profile,
        preferences,
        integrations,
        automationConfig,
        isLoading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
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

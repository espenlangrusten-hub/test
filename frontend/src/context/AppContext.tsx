import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface PlayerData {
  id: string;
  name: string;
  number: number;
  position: string;
  is_captain: boolean;
  is_starter: boolean;
  available: boolean;
  set_piece_roles: string[];
}

export interface TeamData {
  id: string;
  name: string;
  sport: string;
  format: string;
  age_group: string;
  country: string;
  players: PlayerData[];
  formation: string;
  tactic_name: string;
  created_at: string;
  updated_at: string;
}

interface UserData {
  user_id: string;
  email: string;
  name: string;
}

interface AppContextType {
  sport: string;
  format: string;
  currentTeam: TeamData | null;
  user: UserData | null;
  token: string | null;
  authLoading: boolean;
  setSport: (s: string) => void;
  setFormat: (f: string) => void;
  setCurrentTeam: (t: TeamData | null) => void;
  saveTeam: (data: Partial<TeamData>) => Promise<TeamData>;
  loadTeams: () => Promise<TeamData[]>;
  deleteTeam: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sport, setSport] = useState('');
  const [format, setFormat] = useState('');
  const [currentTeam, setCurrentTeam] = useState<TeamData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load stored token on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('auth_user');
        if (stored && storedUser) {
          setToken(stored);
          setUser(JSON.parse(storedUser));
        }
      } catch {}
      setAuthLoading(false);
    })();
  }, []);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    setToken(data.token);
    const userData = { user_id: data.user_id, email: data.email, name: data.name };
    setUser(userData);
    await AsyncStorage.setItem('auth_token', data.token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    setToken(data.token);
    const userData = { user_id: data.user_id, email: data.email, name: data.name };
    setUser(userData);
    await AsyncStorage.setItem('auth_token', data.token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setCurrentTeam(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
  };

  const saveTeam = async (data: Partial<TeamData>): Promise<TeamData> => {
    if (currentTeam?.id) {
      const body = {
        name: data.name ?? currentTeam.name,
        sport: data.sport ?? currentTeam.sport,
        format: data.format ?? currentTeam.format,
        age_group: data.age_group ?? currentTeam.age_group ?? '',
        players: data.players ?? currentTeam.players,
        formation: data.formation ?? currentTeam.formation ?? '',
        tactic_name: data.tactic_name ?? currentTeam.tactic_name ?? '',
      };
      const res = await fetch(`${API_URL}/api/teams/${currentTeam.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const updated = await res.json();
      setCurrentTeam(updated);
      return updated;
    } else {
      const body = {
        name: data.name || 'My Team',
        sport: data.sport || sport,
        format: data.format || format,
        age_group: data.age_group || '',
        players: data.players || [],
        formation: data.formation || '',
        tactic_name: data.tactic_name || '',
      };
      const res = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setCurrentTeam(created);
      return created;
    }
  };

  const loadTeams = async (): Promise<TeamData[]> => {
    try {
      const res = await fetch(`${API_URL}/api/teams`, { headers: authHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/teams/${id}`, { method: 'DELETE', headers: authHeaders() });
    } catch {}
  };

  return (
    <AppContext.Provider
      value={{
        sport, format, currentTeam, user, token, authLoading,
        setSport, setFormat, setCurrentTeam,
        saveTeam, loadTeams, deleteTeam,
        login, register, logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

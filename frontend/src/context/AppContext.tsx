import React, { createContext, useContext, useState } from 'react';

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
  players: PlayerData[];
  formation: string;
  tactic_name: string;
  created_at: string;
  updated_at: string;
}

interface AppContextType {
  sport: string;
  format: string;
  currentTeam: TeamData | null;
  setSport: (s: string) => void;
  setFormat: (f: string) => void;
  setCurrentTeam: (t: TeamData | null) => void;
  saveTeam: (data: Partial<TeamData>) => Promise<TeamData>;
  loadTeams: () => Promise<TeamData[]>;
  deleteTeam: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sport, setSport] = useState('');
  const [format, setFormat] = useState('');
  const [currentTeam, setCurrentTeam] = useState<TeamData | null>(null);

  const saveTeam = async (data: Partial<TeamData>): Promise<TeamData> => {
    if (currentTeam?.id) {
      const body = {
        name: data.name ?? currentTeam.name,
        sport: data.sport ?? currentTeam.sport,
        format: data.format ?? currentTeam.format,
        players: data.players ?? currentTeam.players,
        formation: data.formation ?? currentTeam.formation ?? '',
        tactic_name: data.tactic_name ?? currentTeam.tactic_name ?? '',
      };
      const res = await fetch(`${API_URL}/api/teams/${currentTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        players: data.players || [],
        formation: data.formation || '',
        tactic_name: data.tactic_name || '',
      };
      const res = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setCurrentTeam(created);
      return created;
    }
  };

  const loadTeams = async (): Promise<TeamData[]> => {
    try {
      const res = await fetch(`${API_URL}/api/teams`);
      return await res.json();
    } catch {
      return [];
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/teams/${id}`, { method: 'DELETE' });
    } catch {}
  };

  return (
    <AppContext.Provider
      value={{
        sport, format, currentTeam,
        setSport, setFormat, setCurrentTeam,
        saveTeam, loadTeams, deleteTeam,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

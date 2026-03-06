import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Team } from '../../shared/types';
import { validateTeamCredentials, upsertSession, registerTeam } from '../services/appwrite';
import { cacheCredentials, validateCachedAuth, clearCache } from '../services/localStore';

interface AuthContextValue {
  user: Team | null;
  loading: boolean;
  login: (teamName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (teamName: string, password: string, studentIds: string[]) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to restore session from cache
    const cached = JSON.parse(localStorage.getItem('devwatch_session') || 'null');
    if (cached) {
      setUser(cached);
      // Mark session as online in DB on restore (fire-and-forget)
      if (cached.$id && cached.teamName) {
        upsertSession(cached.$id, cached.teamName, 'online').catch(() => {});
      }
    }
    setLoading(false);
  }, []);

  const login = async (teamName: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Try online auth first
      const team = await validateTeamCredentials(teamName, password);
      if (team) {
        setUser(team);
        localStorage.setItem('devwatch_session', JSON.stringify(team));
        cacheCredentials(teamName, password, team.$id!, team.role);
        await upsertSession(team.$id!, teamName, 'online');
        return { success: true };
      }
      // Online auth returned null = invalid credentials (server reachable)
      return { success: false, error: 'Invalid credentials' };
    } catch (err) {
      // Network error â€” try cached login
      const cached = validateCachedAuth(teamName, password);
      if (cached) {
        const offlineUser: Team = {
          $id: cached.teamId,
          teamName: cached.teamName,
          role: cached.role,
        };
        setUser(offlineUser);
        localStorage.setItem('devwatch_session', JSON.stringify(offlineUser));
        return { success: true };
      }
      return { success: false, error: 'Login failed. Check your connection.' };
    }
  };

  const logout = () => {
    if (user) {
      upsertSession(user.$id!, user.teamName, 'offline').catch(() => {});
    }
    setUser(null);
    localStorage.removeItem('devwatch_session');
  };

  const register = async (
    teamName: string,
    password: string,
    studentIds: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    return registerTeam(teamName, password, studentIds);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Team } from "../../shared/types";
import {
  validateTeamCredentials,
  upsertSession,
  registerTeam,
  getGlobalInternetRestriction,
  subscribeToSettings,
} from "../services/appwrite";

interface AuthContextValue {
  user: Team | null;
  loading: boolean;
  internetBlocked: boolean;
  login: (
    teamName: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    teamName: string,
    password: string,
    studentIds: string[],
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [internetBlocked, setInternetBlocked] = useState(false);

  useEffect(() => {
    localStorage.removeItem("sonar_session");
    localStorage.removeItem("sonar_auth_cache");
    setLoading(false);
  }, []);

  // Subscribe to the global settings for internet restriction
  useEffect(() => {
    if (!user || user.role === 'admin') {
      setInternetBlocked(false);
      return;
    }

    // Fetch initial value
    getGlobalInternetRestriction().then(setInternetBlocked).catch(() => setInternetBlocked(false));

    // Subscribe to realtime changes
    const unsub = subscribeToSettings((blocked) => {
      setInternetBlocked(blocked);
    });

    return () => {
      unsub();
    };
  }, [user?.$id, user?.role]);

  const login = async (
    teamName: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const attestation =
        (await window.electronAPI?.security?.getAttestationData?.()) || {
          token: "DEV_MODE",
          version: "dev",
          buildTimestamp: "DEV_MODE",
          label: "DEV_MODE" as const,
        };
      // Try online auth first
      const team = await validateTeamCredentials(teamName, password);
      if (team) {
        setUser(team);
        await upsertSession(team.$id!, teamName, "online", attestation);
        return { success: true };
      }
      // Online auth returned null = invalid credentials (server reachable)
      return { success: false, error: "Invalid credentials" };
    } catch {
      return {
        success: false,
        error: "Online login is required. Check your connection and try again.",
      };
    }
  };

  const logout = () => {
    if (user) {
      window.electronAPI?.security?.getAttestationData?.()
        .then((attestation) => upsertSession(user.$id!, user.teamName, "offline", attestation))
        .catch(() =>
          upsertSession(user.$id!, user.teamName, "offline", {
            token: "DEV_MODE",
            version: "dev",
            buildTimestamp: "DEV_MODE",
            label: "DEV_MODE",
          })
        );
    }
    setUser(null);
    localStorage.removeItem("sonar_session");
    localStorage.removeItem("sonar_auth_cache");
  };

  const register = async (
    teamName: string,
    password: string,
    studentIds: string[],
  ): Promise<{ success: boolean; error?: string }> => {
    return registerTeam(teamName, password, studentIds);
  };

  return (
    <AuthContext.Provider value={{ user, loading, internetBlocked, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

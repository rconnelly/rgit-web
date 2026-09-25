import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { SessionUser } from "./types";

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (user: string, password: string) => Promise<void>;
  signup: (user: string, password: string, invite: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const data = await api<{ user: SessionUser | null }>("/api/auth/me");
    setUser(data.user);
  };

  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refresh,
      async login(name, password) {
        const data = await api<{ user: SessionUser }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ user: name, password }),
        });
        setUser(data.user);
      },
      async signup(name, password, invite) {
        const data = await api<{ user: SessionUser }>("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ user: name, password, invite }),
        });
        setUser(data.user);
      },
      async logout() {
        await api("/api/auth/logout", { method: "POST" });
        setUser(null);
      },
    }),
    [user, loading],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

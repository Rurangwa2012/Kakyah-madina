"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { writeAuditLog } from "@/lib/firestore";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { profileFromDoc } from "@/lib/userProfile";
import type { AppUser } from "@/types";

export interface AuthUser {
  uid: string;
  email: string | null;
}

interface AuthState {
  firebaseUser: AuthUser | null;
  profile: AppUser | null;
  loading: boolean;
  configured: boolean;
  online: boolean;
  profileError: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [mounted, setMounted] = useState(false);
  const configured = mounted ? isSupabaseConfigured() : true;

  useEffect(() => {
    setMounted(true);
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  async function loadProfile(uid: string) {
    const { data, error } = await getSupabase().from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) {
      setProfileError(error.message);
      setProfile(null);
    } else if (data) {
      setProfile(profileFromDoc(String(data.id), data as Record<string, unknown>));
      setProfileError("");
    } else {
      setProfile(null);
      setProfileError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!mounted) return;
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) {
        setFirebaseUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setFirebaseUser({ uid: user.id, email: user.email ?? null });
      void loadProfile(user.id);
    });
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setFirebaseUser({ uid: user.id, email: user.email ?? null });
      void loadProfile(user.id);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [mounted]);

  const value = useMemo<AuthState>(
    () => ({
      firebaseUser,
      profile,
      loading,
      configured,
      online,
      profileError,
      refreshProfile: async () => {
        const { data } = await getSupabase().auth.getUser();
        if (data.user) await loadProfile(data.user.id);
      },
      login: async (email, password) => {
        const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        try {
          await writeAuditLog({
            action: "LOGIN",
            message: `${email} signed in`,
            actor_id: data.user.id,
            actor_name: email,
            actor_role: "cashier",
          });
        } catch {
          // profile may not exist yet
        }
      },
      logout: async () => {
        if (profile) {
          try {
            await writeAuditLog({
              action: "LOGOUT",
              message: `${profile.name} signed out`,
              actor_id: profile.id,
              actor_name: profile.name,
              actor_role: profile.role,
            });
          } catch {
            // ignore
          }
        }
        await getSupabase().auth.signOut();
      },
    }),
    [firebaseUser, profile, loading, configured, online, profileError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

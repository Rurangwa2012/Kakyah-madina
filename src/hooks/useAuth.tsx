"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseAuth, getDb, isFirebaseConfigured } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/collections";
import { writeAuditLog } from "@/lib/firestore";
import type { AppUser } from "@/types";

interface AuthState {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  configured: boolean;
  online: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (user) => {
      unsubProfile?.();
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      unsubProfile = onSnapshot(doc(getDb(), COLLECTIONS.users, user.uid), (snap) => {
        if (snap.exists()) {
          setProfile({ id: snap.id, ...(snap.data() as Omit<AppUser, "id">) });
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
    });
    return () => {
      unsub();
      unsubProfile?.();
    };
  }, [configured]);

  const value = useMemo<AuthState>(
    () => ({
      firebaseUser,
      profile,
      loading,
      configured,
      online,
      login: async (email, password) => {
        const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        try {
          await writeAuditLog({
            action: "LOGIN",
            message: `${email} signed in`,
            actor_id: cred.user.uid,
            actor_name: email,
            actor_role: "cashier",
          });
        } catch {
          // Audit write may fail until user doc/rules exist.
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
        await signOut(getFirebaseAuth());
      },
    }),
    [firebaseUser, profile, loading, configured, online],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

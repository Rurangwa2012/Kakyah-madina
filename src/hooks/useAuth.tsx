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
import { profileFromDoc } from "@/lib/userProfile";
import type { AppUser } from "@/types";

interface AuthState {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  configured: boolean;
  online: boolean;
  profileError: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [mounted, setMounted] = useState(false);
  const configured = mounted ? isFirebaseConfigured() : true;

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

  useEffect(() => {
    if (!mounted) return;
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (user) => {
      unsubProfile?.();
      setFirebaseUser(user);
      setProfileError("");
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        unsubProfile = onSnapshot(
          doc(getDb(), COLLECTIONS.users, user.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile(profileFromDoc(snap.id, snap.data() as Record<string, unknown>));
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            setProfileError(err.message);
            setProfile(null);
            setLoading(false);
          },
        );
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Could not load profile");
        setLoading(false);
      }
    });
    return () => {
      unsub();
      unsubProfile?.();
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
    [firebaseUser, profile, loading, configured, online, profileError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

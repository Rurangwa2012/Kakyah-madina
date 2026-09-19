"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button, ErrorState } from "@/components/ui";

export default function LoginPage() {
  const { login, configured, loading, profile, firebaseUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && firebaseUser && profile?.active) {
    router.replace(profile.role === "owner" ? "/dashboard" : "/pos");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 shadow-lg"
      >
        <p className="text-center text-xs tracking-[0.3em] text-[var(--gold)]">MALAYSIAN FOOD</p>
        <h1 className="font-display mt-2 text-center text-4xl">KAK YAH</h1>
        <p className="mb-8 text-center text-lg text-[var(--muted)]">Nasi kandar</p>
        {!configured ? (
          <ErrorState message="Add Firebase values to .env.local from .env.example before signing in." />
        ) : null}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="h-4" />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={busy || !configured} className="mt-6 w-full">
          {busy ? "Signing in…" : "LOGIN"}
        </Button>
      </form>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase } from "@/lib/supabase";
import { useIdleLock } from "@/hooks/useIdleLock";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/I18nProvider";

export function SessionLock({ minutes, children }: { minutes: number; children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const { t } = useI18n();
  const { locked, unlock, lockNow } = useIdleLock(minutes, Boolean(profile));

  useEffect(() => {
    const onLock = () => lockNow();
    window.addEventListener("kak-yah-lock", onLock);
    return () => window.removeEventListener("kak-yah-lock", onLock);
  }, [lockNow]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onUnlock(event: FormEvent) {
    event.preventDefault();
    if (!profile?.email) return;
    setError("");
    const { error: authError } = await getSupabase().auth.signInWithPassword({
      email: profile.email,
      password,
    });
    if (authError) {
      setError(t("auth.badCredentials"));
      return;
    }
    setPassword("");
    unlock();
  }

  if (!locked) {
    return (
      <>
        <button type="button" className="sr-only" onClick={lockNow} aria-hidden />
        {children}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--ink)]/80 p-4">
      <form onSubmit={onUnlock} className="w-full max-w-md rounded-3xl bg-white p-6">
        <h2 className="font-display text-2xl">{t("lock.title")}</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">{profile?.name}</p>
        <label>{t("password")}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error ? <p className="mt-2 text-sm text-[var(--spice)]">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <Button type="submit">{t("lock.unlock")}</Button>
          <Button type="button" variant="ghost" onClick={() => void logout()}>
            {t("logout")}
          </Button>
        </div>
      </form>
    </div>
  );
}

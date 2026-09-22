"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createOwnProfile } from "@/lib/firestore";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n/I18nProvider";
import type { UserRole } from "@/types";

const SQL_URL = "https://supabase.com/dashboard/project/dspwrfcjdcowuymjazze/sql/new";
const AUTH_URL = "https://supabase.com/dashboard/project/dspwrfcjdcowuymjazze/auth/users";

export default function UnauthorizedPage() {
  const { profile, firebaseUser, profileError, logout, refreshProfile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.active) {
      router.replace(profile.role === "owner" ? "/dashboard" : "/pos");
    }
  }, [profile, router]);

  async function setup(role: UserRole) {
    if (!firebaseUser?.email) return;
    setBusy(true);
    setError("");
    try {
      await createOwnProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: role === "owner" ? "Owner" : "Cashier",
        role,
      });
      await refreshProfile();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Run supabase/schema.sql in the SQL Editor if tables are missing.`
          : "Could not create profile.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-xl">
        <h1 className="font-display text-center text-3xl">{t("access.title")}</h1>
        <p className="mt-2 text-center text-[var(--muted)]">
          {profile ? t("access.inactive") : t("access.needDoc")}
        </p>
        {profileError ? <p className="mt-3 text-sm text-red-700">{profileError}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <ol className="mt-5 list-decimal space-y-3 ps-5 text-sm">
          <li>
            Open{" "}
            <a className="font-bold text-[var(--spice)] underline" href={SQL_URL} target="_blank" rel="noreferrer">
              Supabase SQL Editor
            </a>{" "}
            and run <strong>supabase/schema.sql</strong> from this project.
          </li>
          <li>
            Create staff in{" "}
            <a className="font-bold text-[var(--spice)] underline" href={AUTH_URL} target="_blank" rel="noreferrer">
              Authentication → Users
            </a>
            , then come back and set up the profile.
          </li>
        </ol>

        {firebaseUser ? (
          <p className="mt-4 break-all rounded-xl bg-[var(--paper)] p-3 font-mono text-xs">{firebaseUser.uid}</p>
        ) : null}

        {!profile && firebaseUser ? (
          <div className="mt-5 grid gap-3">
            <Button disabled={busy} onClick={() => void setup("cashier")}>
              {busy ? t("saving") : t("access.setupCashier")}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void setup("owner")}>
              {t("access.setupOwner")}
            </Button>
          </div>
        ) : null}

        <div className="mt-5 flex justify-center">
          <Button variant="ghost" onClick={() => void logout()}>
            {t("logout")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

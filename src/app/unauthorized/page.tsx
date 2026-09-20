"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/hooks/useAuth";
import { createOwnProfile } from "@/lib/firestore";
import { FIRESTORE_RULES_TEXT } from "@/lib/firestoreRulesText";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n/I18nProvider";
import type { UserRole } from "@/types";

const RULES_URL = "https://console.firebase.google.com/project/kakyah-madina/firestore/rules";
const DATA_URL = "https://console.firebase.google.com/project/kakyah-madina/firestore/data";

export default function UnauthorizedPage() {
  const { profile, firebaseUser, profileError, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"rules" | "uid" | "">("");
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
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      setError(
        code.includes("permission")
          ? "The live Firebase rules still block this write. Publish the rules below, wait a few seconds, then try again."
          : err instanceof Error
            ? err.message
            : "Could not create the Firestore user profile.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, kind: "rules" | "uid") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
  }

  const suggestedRole =
    firebaseUser?.email?.toLowerCase().includes("owner") ? "owner" : "cashier";

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
            <a className="font-bold text-[var(--spice)] underline" href={RULES_URL} target="_blank" rel="noreferrer">
              Firestore Rules
            </a>
          </li>
          <li>
            Select all old rules, delete them, paste the copied rules, then click{" "}
            <strong>Publish</strong>.
            <div className="mt-2">
              <Button variant="ghost" onClick={() => void copy(FIRESTORE_RULES_TEXT, "rules")}>
                {copied === "rules" ? t("access.rulesCopied") : t("access.copyRules")}
              </Button>
            </div>
          </li>
          <li>Wait about 10 seconds, come back here, and click Set up as {suggestedRole === "owner" ? "Owner" : "Cashier"}.</li>
        </ol>

        {firebaseUser ? (
          <div className="mt-5 rounded-xl bg-[var(--paper)] p-3 text-sm">
            <p className="font-bold">Or create the document by hand</p>
            <p className="mt-2">
              Open{" "}
              <a className="font-bold text-[var(--spice)] underline" href={DATA_URL} target="_blank" rel="noreferrer">
                Firestore Data
              </a>
              , collection <strong>users</strong>, document ID:
            </p>
            <p className="mt-1 break-all font-mono">{firebaseUser.uid}</p>
            <Button className="mt-2" variant="ghost" onClick={() => void copy(firebaseUser.uid, "uid")}>
              {copied === "uid" ? t("access.uidCopied") : t("access.copyUid")}
            </Button>
            <p className="mt-3">name: {suggestedRole === "owner" ? "Owner" : "Cashier"} (string)</p>
            <p>email: {firebaseUser.email} (string)</p>
            <p>role: {suggestedRole} (string)</p>
            <p>inventory_access: true (boolean)</p>
            <p>active: true (boolean)</p>
            <p>created_at: 1 (number)</p>
            <p>updated_at: 1 (number)</p>
          </div>
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

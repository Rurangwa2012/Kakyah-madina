"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button, Card } from "@/components/ui";

export default function UnauthorizedPage() {
  const { profile, firebaseUser, profileError, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-lg text-center">
        <h1 className="font-display text-3xl">Access not ready</h1>
        <p className="mt-2 text-[var(--muted)]">
          {profile
            ? "This account is inactive, or this page is not allowed for your role."
            : "Firebase login worked, but this Auth UID has no matching Firestore users document yet."}
        </p>
        {profileError ? <p className="mt-3 text-sm text-red-700">{profileError}</p> : null}
        {firebaseUser ? (
          <p className="mt-4 break-all rounded-xl bg-[var(--paper)] p-3 text-left text-sm">
            Create Firestore document <strong>users/{firebaseUser.uid}</strong>
            <br />
            email: {firebaseUser.email}
            <br />
            role: owner or cashier
            <br />
            active: true
          </p>
        ) : null}
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={() => void logout()}>Logout</Button>
        </div>
      </Card>
    </div>
  );
}

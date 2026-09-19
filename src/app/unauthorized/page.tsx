"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card } from "@/components/ui";

export default function UnauthorizedPage() {
  const { profile, logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <h1 className="font-display text-3xl">Access not ready</h1>
        <p className="mt-2 text-[var(--muted)]">
          {profile
            ? "This account exists but is inactive, or this page is not allowed for your role."
            : "Sign in with an owner or cashier account that has a Firestore user profile."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/login">
            <Button>Back to login</Button>
          </Link>
          <Button variant="ghost" onClick={() => void logout()}>
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

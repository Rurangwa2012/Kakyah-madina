import type { AppUser, UserRole } from "@/types";

export function normalizeRole(value: unknown): UserRole {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "owner"
    ? "owner"
    : "cashier";
}

export function isActiveFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function profileFromDoc(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    name: String(data.name ?? data.email ?? "Staff"),
    email: String(data.email ?? ""),
    role: normalizeRole(data.role),
    inventory_access: data.inventory_access !== false,
    active: isActiveFlag(data.active),
    created_at: Number(data.created_at ?? Date.now()),
    updated_at: Number(data.updated_at ?? Date.now()),
  };
}

export function authErrorKey(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "auth.badCredentials";
  }
  if (code.includes("invalid-email")) return "auth.badEmail";
  if (code.includes("too-many-requests")) return "auth.tooMany";
  if (code.includes("network-request-failed")) return "auth.network";
  if (code.includes("configuration-not-found")) return "auth.noAuth";
  return "auth.failed";
}

export function authErrorMessage(err: unknown): string {
  const key = authErrorKey(err);
  const fallback: Record<string, string> = {
    "auth.badCredentials": "Email or password is incorrect.",
    "auth.badEmail": "Enter a valid email address.",
    "auth.tooMany": "Too many attempts. Wait a moment and try again.",
    "auth.network": "Network error. Check your internet connection.",
    "auth.noAuth": "Firebase Authentication is not enabled for this project yet.",
    "auth.failed": "Login failed.",
  };
  return fallback[key] ?? (err instanceof Error ? err.message : "Login failed.");
}

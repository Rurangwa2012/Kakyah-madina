import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://dspwrfcjdcowuymjazze.supabase.co";

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/** @deprecated use isSupabaseConfigured */
export const isFirebaseConfigured = isSupabaseConfigured;

let browserClient: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
  }
  if (!browserClient) {
    browserClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

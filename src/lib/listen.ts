import { getSupabase } from "@/lib/supabase";

export type Unsubscribe = () => void;

export function listenQuery<T>(
  table: string,
  loader: () => Promise<T[]>,
  cb: (rows: T[]) => void,
): Unsubscribe {
  let cancelled = false;
  const run = async () => {
    try {
      const rows = await loader();
      if (!cancelled) cb(rows);
    } catch (err) {
      console.error("Supabase listener failed", err);
      if (!cancelled) cb([]);
    }
  };
  void run();
  const channel = getSupabase()
    .channel(`kak-yah-${table}-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => {
      void run();
    })
    .subscribe();
  return () => {
    cancelled = true;
    void getSupabase().removeChannel(channel);
  };
}

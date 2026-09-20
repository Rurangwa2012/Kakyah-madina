import { onSnapshot, type Query, type Unsubscribe } from "firebase/firestore";

export function listenDocs<T>(
  q: Query,
  map: (id: string, data: Record<string, unknown>) => T,
  cb: (rows: T[]) => void,
): Unsubscribe {
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => map(d.id, d.data() as Record<string, unknown>))),
    (err) => {
      console.error("Firestore listener failed", err);
      cb([]);
    },
  );
}

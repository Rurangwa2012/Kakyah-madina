"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE = "kak-yah-pos-lock";

export function useIdleLock(minutes: number, enabled: boolean) {
  const [locked, setLocked] = useState(false);

  const lockNow = useCallback(() => {
    sessionStorage.setItem(STORAGE, "1");
    setLocked(true);
  }, []);

  const unlock = useCallback(() => {
    sessionStorage.removeItem(STORAGE);
    setLocked(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    if (sessionStorage.getItem(STORAGE) === "1") setLocked(true);
    let timer: ReturnType<typeof setTimeout>;
    const ms = Math.max(1, minutes) * 60_000;
    const bump = () => {
      if (sessionStorage.getItem(STORAGE) === "1") return;
      clearTimeout(timer);
      timer = setTimeout(lockNow, ms);
    };
    bump();
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((name) => window.addEventListener(name, bump));
    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, bump));
    };
  }, [minutes, enabled, lockNow, locked]);

  return { locked, unlock, lockNow };
}

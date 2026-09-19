"use client";

import { useEffect, useState } from "react";
import { listenMenu } from "@/services/catalog";
import type { MenuItem } from "@/types";

export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = listenMenu((next) => {
      setItems(next.filter((item) => !item.archived));
      setLoading(false);
    });
    return unsub;
  }, []);
  return { items, loading };
}

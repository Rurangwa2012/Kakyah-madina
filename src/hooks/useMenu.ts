"use client";

import { useEffect, useState } from "react";
import { listenMenu } from "@/services/catalog";
import type { MenuItem } from "@/types";

export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    try {
      return listenMenu((next) => {
        setItems(next);
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }
  }, []);
  return { items, loading };
}

import { useQuery } from "@tanstack/react-query";
import type { ExpiringItem } from "@/types/items";

async function fetchExpiringItems(): Promise<ExpiringItem[]> {
  const res = await fetch("/api/items/expiring");
  if (!res.ok) throw new Error("Failed to fetch expiring items");
  const data = await res.json();
  return data.items;
}

export function useExpiringItems() {
  return useQuery({
    queryKey: ["items", "expiring"],
    queryFn: fetchExpiringItems,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

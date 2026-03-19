"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ConsumptionReport,
  ConsumptionFilters,
  CostAllocationReport,
  CostAllocationFilters,
  LowStockReport,
} from "@/types/reports";

async function fetchJSON(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val) q.set(key, val);
  }
  return q.toString() ? `?${q.toString()}` : "";
}

export function useConsumptionReport(filters: ConsumptionFilters) {
  return useQuery<ConsumptionReport>({
    queryKey: ["reports", "consumption", filters],
    queryFn: () =>
      fetchJSON(
        `/api/reports/consumption${buildQuery({
          from: filters.from,
          to: filters.to,
          businessEntity: filters.businessEntity,
          categoryId: filters.categoryId,
        })}`
      ),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCostAllocationReport(filters: CostAllocationFilters) {
  return useQuery<CostAllocationReport>({
    queryKey: ["reports", "cost-allocation", filters],
    queryFn: () =>
      fetchJSON(
        `/api/reports/cost-allocation${buildQuery({
          from: filters.from,
          to: filters.to,
        })}`
      ),
    staleTime: 2 * 60 * 1000,
  });
}

export function useLowStockReport() {
  return useQuery<LowStockReport>({
    queryKey: ["reports", "low-stock"],
    queryFn: () => fetchJSON("/api/reports/low-stock"),
    staleTime: 2 * 60 * 1000,
  });
}

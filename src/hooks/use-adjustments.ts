"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateAdjustmentInput } from "@/lib/validations/adjustments";
import type { AdjustmentWithDetails } from "@/types/adjustments";

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation<{ adjustment: AdjustmentWithDetails }, Error, CreateAdjustmentInput>({
    mutationFn: (data) =>
      fetchJSON("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function usePendingAdjustments() {
  return useQuery<{ adjustments: AdjustmentWithDetails[] }>({
    queryKey: ["adjustments", "pending"],
    queryFn: () => fetchJSON("/api/adjustments/pending"),
    staleTime: 0,
  });
}

export function useApproveAdjustment() {
  const queryClient = useQueryClient();
  return useMutation<{ adjustment: AdjustmentWithDetails }, Error, string>({
    mutationFn: (id) =>
      fetchJSON(`/api/adjustments/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useRejectAdjustment() {
  const queryClient = useQueryClient();
  return useMutation<
    { adjustment: AdjustmentWithDetails },
    Error,
    { id: string; rejectionReason?: string }
  >({
    mutationFn: ({ id, rejectionReason }) =>
      fetchJSON(`/api/adjustments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

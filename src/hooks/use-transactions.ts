"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTransactionInput, EditTransactionInput } from "@/lib/validations/transactions";
import type { TransactionWithDetails } from "@/types/transactions";

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function useTransactions(filters?: {
  itemId?: string;
  businessEntity?: string;
  transactionType?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.itemId) params.set("itemId", filters.itemId);
  if (filters?.businessEntity) params.set("businessEntity", filters.businessEntity);
  if (filters?.transactionType) params.set("transactionType", filters.transactionType);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.limit) params.set("limit", String(filters.limit));

  return useQuery<{ transactions: TransactionWithDetails[] }>({
    queryKey: ["transactions", filters],
    queryFn: () => fetchJSON(`/api/transactions?${params.toString()}`),
    staleTime: 30 * 1000,
  });
}

export function useTransaction(id: string | null) {
  return useQuery<{ transaction: TransactionWithDetails }>({
    queryKey: ["transactions", id],
    queryFn: () => fetchJSON(`/api/transactions/${id}`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation<{ transaction: TransactionWithDetails }, Error, CreateTransactionInput>({
    mutationFn: (data) =>
      fetchJSON("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useEditTransaction(id: string) {
  const queryClient = useQueryClient();
  return useMutation<{ transaction: TransactionWithDetails }, Error, EditTransactionInput>({
    mutationFn: (data) =>
      fetchJSON(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

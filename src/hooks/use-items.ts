import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ItemWithCategory } from "@/types/items";
import type { CreateItemInput, UpdateItemInput, UpdatePriceInput } from "@/lib/validations/items";

interface ItemsFilters {
  search?: string;
  categoryId?: string;
  showInactive?: boolean;
}

async function fetchItems(filters: ItemsFilters): Promise<ItemWithCategory[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.showInactive) params.set("showInactive", "true");

  const res = await fetch(`/api/items?${params}`);
  if (!res.ok) throw new Error("Failed to fetch items");
  const data = await res.json();
  return data.items;
}

async function fetchItem(id: string): Promise<ItemWithCategory> {
  const res = await fetch(`/api/items/${id}`);
  if (!res.ok) throw new Error("Failed to fetch item");
  const data = await res.json();
  return data.item;
}

export function useItems(filters: ItemsFilters = {}) {
  return useQuery({
    queryKey: ["items", filters],
    queryFn: () => fetchItems(filters),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ["items", id],
    queryFn: () => fetchItem(id),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateItemInput) => {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create item");
      return json.item as ItemWithCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateItemInput) => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update item");
      return json.item as ItemWithCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItemPrice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdatePriceInput) => {
      const res = await fetch(`/api/items/${id}/price`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update price");
      return json.item as ItemWithCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeactivateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/items/${id}/deactivate`, { method: "PUT" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to deactivate item");
      return json.item as ItemWithCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useActivateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/items/${id}/activate`, { method: "PUT" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to activate item");
      return json.item as ItemWithCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

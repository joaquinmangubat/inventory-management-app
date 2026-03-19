import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category, CategoryWithCount } from "@/types/items";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/lib/validations/categories";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  const data = await res.json();
  return data.categories;
}

async function fetchCategoriesWithCount(): Promise<CategoryWithCount[]> {
  const res = await fetch("/api/categories?includeCount=true");
  if (!res.ok) throw new Error("Failed to fetch categories");
  const data = await res.json();
  return data.categories;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes — categories rarely change
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ["categories", "withCount"],
    queryFn: fetchCategoriesWithCount,
    staleTime: 0, // always fresh on the admin page
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create category");
      return json.category as CategoryWithCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateCategoryInput) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update category");
      return json.category as CategoryWithCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete category");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useReorderCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      direction,
    }: {
      id: string;
      direction: "up" | "down";
    }) => {
      const res = await fetch(`/api/categories/${id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reorder category");
      return json.categories as CategoryWithCount[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

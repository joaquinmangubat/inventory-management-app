"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/notifications";

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function useNotifications() {
  return useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: () => fetchJSON("/api/notifications"),
    staleTime: 0,
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["notifications", "count"],
    queryFn: () => fetchJSON("/api/notifications/count"),
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation<{ notification: Notification }, Error, string>({
    mutationFn: (id) =>
      fetchJSON(`/api/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation<{ updated: number }, Error, void>({
    mutationFn: () =>
      fetchJSON("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SystemSettings } from "@/types/settings";
import type { UpdateSettingsInput } from "@/lib/validations/settings";

async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  const data = await res.json();
  return data.settings;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateSettingsInput): Promise<SystemSettings> => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update settings");
      return json.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

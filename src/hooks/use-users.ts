import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/users";
import type {
  CreateUserInput,
  UpdateUserInput,
  ResetCredentialInput,
} from "@/lib/validations/users";

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  const data = await res.json();
  return data.users;
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  const data = await res.json();
  return data.user;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 0,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create user");
      return json.user as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateUserInput) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update user");
      return json.user as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useResetCredential(id: string) {
  return useMutation({
    mutationFn: async (data: ResetCredentialInput) => {
      const res = await fetch(`/api/users/${id}/reset-credential`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reset credential");
      return json;
    },
  });
}

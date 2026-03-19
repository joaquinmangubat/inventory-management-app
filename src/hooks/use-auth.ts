"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/types/auth";

export interface AuthContextValue {
  user: SessionUser | null;
  isOwner: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

"use client";

import { createContext, useContext } from "react";

export interface SessionTimeoutContextValue {
  showWarning: boolean;
  remainingSeconds: number;
  resetTimer: () => void;
  signOut: () => void;
}

export const SessionTimeoutContext =
  createContext<SessionTimeoutContextValue | null>(null);

export function useSessionTimeout(): SessionTimeoutContextValue {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error(
      "useSessionTimeout must be used within a SessionTimeoutProvider"
    );
  }
  return context;
}

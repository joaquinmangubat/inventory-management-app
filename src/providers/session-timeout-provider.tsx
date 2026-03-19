"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SessionTimeoutContext } from "@/hooks/use-session-timeout";
import { useAuth } from "@/hooks/use-auth";

const SESSION_TIMEOUT_MS = 90 * 60 * 1000; // 90 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // Show warning 5 minutes before expiry
const WARNING_AT_MS = SESSION_TIMEOUT_MS - WARNING_BEFORE_MS; // 85 minutes

export function SessionTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, refreshSession } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const lastActivityRef = useRef(Date.now());
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(async () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setRemainingSeconds(300);
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
    await refreshSession();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    setShowWarning(false);
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
    await logout();
  }, [logout]);

  // Track user activity
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };
    events.forEach((e) => window.addEventListener(e, handleActivity));
    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, []);

  // Check for timeout
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= SESSION_TIMEOUT_MS) {
        // Session expired
        signOut();
        return;
      }

      if (elapsed >= WARNING_AT_MS && !showWarning) {
        setShowWarning(true);
        const remaining = Math.ceil((SESSION_TIMEOUT_MS - elapsed) / 1000);
        setRemainingSeconds(remaining);

        // Start countdown
        warningIntervalRef.current = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              signOut();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(checkInterval);
      if (warningIntervalRef.current) {
        clearInterval(warningIntervalRef.current);
      }
    };
  }, [showWarning, signOut]);

  return (
    <SessionTimeoutContext.Provider
      value={{ showWarning, remainingSeconds, resetTimer, signOut }}
    >
      {children}
    </SessionTimeoutContext.Provider>
  );
}

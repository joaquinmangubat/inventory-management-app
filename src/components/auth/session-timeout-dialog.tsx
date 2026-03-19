"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { Clock } from "lucide-react";

export function SessionTimeoutDialog() {
  const { showWarning, remainingSeconds, resetTimer, signOut } =
    useSessionTimeout();

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <Dialog open={showWarning}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Session Expiring
          </DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity. You will be signed out
            automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-4">
          <span
            className="text-4xl font-mono font-bold text-yellow-600"
            aria-live="polite"
          >
            {timeDisplay}
          </span>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
          <Button onClick={resetTimer}>Stay Signed In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

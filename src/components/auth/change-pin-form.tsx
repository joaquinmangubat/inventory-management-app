"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ChangePinForm() {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handlePinChange(
    setter: (v: string) => void
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, "");
      setter(val);
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\d{4,6}$/.test(newPin)) {
      setError("New PIN must be 4-6 digits");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to change PIN");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change PIN</CardTitle>
        <CardDescription>
          You must change your PIN before continuing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPin">Current PIN</Label>
            <Input
              id="currentPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={currentPin}
              onChange={handlePinChange(setCurrentPin)}
              required
              autoFocus
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPin">New PIN</Label>
            <Input
              id="newPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={handlePinChange(setNewPin)}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Must be 4-6 digits
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirm New PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={handlePinChange(setConfirmPin)}
              required
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Changing PIN..." : "Change PIN"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

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
import type { AuthType } from "@/types/auth";

type Step = "email" | "credential";

export function LoginFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [authType, setAuthType] = useState<AuthType>("password");
  const [credential, setCredential] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Account not found");
        return;
      }

      const data = await res.json();
      setAuthType(data.authType);
      setFullName(data.fullName);
      setStep("credential");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credential }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid credentials");
        return;
      }

      const data = await res.json();

      if (data.user.mustChangePassword) {
        const route =
          data.user.authType === "pin" ? "/change-pin" : "/change-password";
        router.push(route);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    setStep("email");
    setCredential("");
    setError("");
    setShowPassword(false);
  }

  if (step === "email") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your email to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Looking up..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          {fullName} &mdash; enter your{" "}
          {authType === "pin" ? "PIN" : "password"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="credential">
              {authType === "pin" ? "PIN" : "Password"}
            </Label>
            {authType === "pin" ? (
              <Input
                id="credential"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter your PIN"
                value={credential}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setCredential(val);
                }}
                required
                autoFocus
                autoComplete="current-password"
              />
            ) : (
              <div className="relative">
                <Input
                  id="credential"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  required
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            )}
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleBack}
          >
            Back
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

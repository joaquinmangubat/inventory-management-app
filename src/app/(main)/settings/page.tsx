"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { changePasswordSchema, changePinSchema } from "@/lib/validations/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, KeyRound, User, Settings, Info } from "lucide-react";
import { toast } from "sonner";
import type { ChangePasswordInput, ChangePinInput } from "@/lib/validations/auth";
import type { UpdateSettingsInput } from "@/lib/validations/settings";

const APP_VERSION = "0.1.0";

// ─── Change Password Dialog ────────────────────────────────

function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  async function onSubmit(data: ChangePasswordInput) {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to change password");
      toast.success("Password updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Change PIN Dialog ─────────────────────────────────────

function ChangePinDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePinInput>({
    resolver: zodResolver(changePinSchema),
  });

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  async function onSubmit(data: ChangePinInput) {
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to change PIN");
      toast.success("PIN updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change PIN");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change PIN</DialogTitle>
          <DialogDescription>
            Enter your current PIN and choose a new 4–6 digit PIN.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="currentPin">Current PIN</Label>
            <Input
              id="currentPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              {...register("currentPin")}
            />
            {errors.currentPin && (
              <p className="text-xs text-destructive">{errors.currentPin.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPin">New PIN</Label>
            <Input
              id="newPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="4–6 digits"
              {...register("newPin")}
            />
            {errors.newPin && (
              <p className="text-xs text-destructive">{errors.newPin.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPin">Confirm New PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              {...register("confirmPin")}
            />
            {errors.confirmPin && (
              <p className="text-xs text-destructive">{errors.confirmPin.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update PIN
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── System Settings Form ──────────────────────────────────

const systemSettingsFormSchema = z.object({
  session_timeout_minutes: z.number().int().min(15).max(480),
  edit_window_minutes: z.number().int().min(1).max(60),
  require_adjustment_notes: z.enum(["true", "false"]),
  expiry_alert_days: z.number().int().min(1).max(30),
  low_stock_threshold_percent: z.number().int().min(1).max(100),
});

type SystemSettingsFormValues = z.infer<typeof systemSettingsFormSchema>;

function SystemSettingsForm() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<SystemSettingsFormValues>({
    resolver: zodResolver(systemSettingsFormSchema),
  });

  const requireNotes = watch("require_adjustment_notes");

  useEffect(() => {
    if (settings) {
      reset({
        session_timeout_minutes: settings.session_timeout_minutes,
        edit_window_minutes: settings.edit_window_minutes,
        require_adjustment_notes: settings.require_adjustment_notes ? "true" : "false",
        expiry_alert_days: settings.expiry_alert_days,
        low_stock_threshold_percent: settings.low_stock_threshold_percent,
      });
    }
  }, [settings, reset]);

  async function onSubmit(data: SystemSettingsFormValues) {
    try {
      const payload: UpdateSettingsInput = {
        session_timeout_minutes: data.session_timeout_minutes,
        edit_window_minutes: data.edit_window_minutes,
        require_adjustment_notes: data.require_adjustment_notes,
        expiry_alert_days: data.expiry_alert_days,
        low_stock_threshold_percent: data.low_stock_threshold_percent,
      };
      await updateSettings.mutateAsync(payload);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="session_timeout_minutes">Session Timeout (minutes)</Label>
        <Input
          id="session_timeout_minutes"
          type="number"
          min={15}
          max={480}
          {...register("session_timeout_minutes")}
        />
        <p className="text-xs text-muted-foreground">
          Requires re-login to take effect. (15–480 min)
        </p>
        {errors.session_timeout_minutes && (
          <p className="text-xs text-destructive">{errors.session_timeout_minutes.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit_window_minutes">Edit Window (minutes)</Label>
        <Input
          id="edit_window_minutes"
          type="number"
          min={1}
          max={60}
          {...register("edit_window_minutes")}
        />
        <p className="text-xs text-muted-foreground">
          How long after logging a transaction users can edit it. (1–60 min)
        </p>
        {errors.edit_window_minutes && (
          <p className="text-xs text-destructive">{errors.edit_window_minutes.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="require_adjustment_notes" className="text-base">
            Require Adjustment Notes
          </Label>
          <p className="text-sm text-muted-foreground">
            Staff must provide a reason when submitting stock adjustments.
          </p>
        </div>
        <Switch
          id="require_adjustment_notes"
          checked={requireNotes === "true"}
          onCheckedChange={(checked) =>
            setValue("require_adjustment_notes", checked ? "true" : "false", {
              shouldDirty: true,
            })
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expiry_alert_days">Expiry Alert Threshold (days)</Label>
        <Input
          id="expiry_alert_days"
          type="number"
          min={1}
          max={30}
          {...register("expiry_alert_days")}
        />
        <p className="text-xs text-muted-foreground">
          Show expiry warnings this many days before an item expires. (1–30 days)
        </p>
        {errors.expiry_alert_days && (
          <p className="text-xs text-destructive">{errors.expiry_alert_days.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="low_stock_threshold_percent">Low Stock Threshold (%)</Label>
        <Input
          id="low_stock_threshold_percent"
          type="number"
          min={1}
          max={100}
          {...register("low_stock_threshold_percent")}
        />
        <p className="text-xs text-muted-foreground">
          Flag items as low-stock when quantity falls below this percentage of par level.
          (1–100%)
        </p>
        {errors.low_stock_threshold_percent && (
          <p className="text-xs text-destructive">
            {errors.low_stock_threshold_percent.message}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Page ──────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, isOwner } = useAuth();
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);

  const isPin = user?.authType === "pin";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Settings"
        description="Manage your account and app preferences."
      />

      {/* Section A — Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Your profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Full Name</Label>
              <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {user?.fullName ?? "—"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Email</Label>
              <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {user?.email ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => setCredentialDialogOpen(true)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Change {isPin ? "PIN" : "Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section B — System Settings (owner only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Configure app-wide behaviour. Changes take effect immediately (except session
              timeout).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SystemSettingsForm />
          </CardContent>
        </Card>
      )}

      {/* Section C — About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">App Version:</span>{" "}
            {APP_VERSION}
          </p>
          <p>
            <span className="font-medium text-foreground">Brands:</span> Arcy&rsquo;s Kitchen
            &amp; Bale Kapampangan
          </p>
          <p>
            <span className="font-medium text-foreground">Support:</span>{" "}
            <a
              href="mailto:support@example.com"
              className="underline underline-offset-4 hover:text-foreground"
            >
              support@example.com
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Credential change dialogs */}
      {isPin ? (
        <ChangePinDialog
          open={credentialDialogOpen}
          onClose={() => setCredentialDialogOpen(false)}
        />
      ) : (
        <ChangePasswordDialog
          open={credentialDialogOpen}
          onClose={() => setCredentialDialogOpen(false)}
        />
      )}
    </div>
  );
}

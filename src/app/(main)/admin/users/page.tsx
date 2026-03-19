"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useUsers, useUpdateUser, useResetCredential } from "@/hooks/use-users";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserPlus,
  Pencil,
  KeyRound,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@/types/users";

// ─── Reset Credential Modal ────────────────────────────────

interface ResetModalProps {
  user: User | null;
  onClose: () => void;
}

function ResetCredentialModal({ user, onClose }: ResetModalProps) {
  const [value, setValue] = useState("");
  const resetMutation = useResetCredential(user?.id ?? "");

  useEffect(() => {
    if (user) setValue("");
  }, [user]);

  async function handleReset() {
    if (!user) return;
    try {
      await resetMutation.mutateAsync({ newCredential: value });
      toast.success(
        `${user.authType === "pin" ? "PIN" : "Password"} reset for ${user.fullName}`
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset credential");
    }
  }

  const isPin = user?.authType === "pin";
  const isValid = isPin
    ? /^\d{4,6}$/.test(value)
    : value.length >= 8;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Reset {isPin ? "PIN" : "Password"} — {user?.fullName}
          </DialogTitle>
          <DialogDescription>
            Enter a new {isPin ? "PIN" : "password"}. The user will be required
            to change it on their next login.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Input
            type={isPin ? "text" : "password"}
            inputMode={isPin ? "numeric" : undefined}
            maxLength={isPin ? 6 : undefined}
            placeholder={isPin ? "4–6 digits" : "Min. 8 characters"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isValid && handleReset()}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={resetMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            disabled={!isValid || resetMutation.isPending}
          >
            {resetMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Reset {isPin ? "PIN" : "Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────

export default function UsersAdminPage() {
  const router = useRouter();
  const { user: currentUser, isOwner, isLoading: authLoading } = useAuth();

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  const { data: users = [], isLoading } = useUsers();

  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.replace("/dashboard");
    }
  }, [authLoading, isOwner, router]);

  const updateUser = useUpdateUser(toggleTarget?.id ?? "");

  if (authLoading || !isOwner) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleToggleActive() {
    if (!toggleTarget) return;
    try {
      await updateUser.mutateAsync({ isActive: !toggleTarget.isActive });
      toast.success(
        `${toggleTarget.fullName} ${toggleTarget.isActive ? "deactivated" : "activated"}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setToggleTarget(null);
    }
  }

  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="User Management"
        description="Manage staff and owner accounts."
      >
        <Button asChild>
          <Link href="/admin/users/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Users className="h-10 w-10 opacity-40" />
          <p className="text-sm">No users yet.</p>
        </div>
      ) : (
        <UserTable
          users={[...activeUsers, ...inactiveUsers]}
          currentUserId={currentUser?.userId ?? ""}
          onReset={setResetTarget}
          onToggleActive={(u) => setToggleTarget(u)}
        />
      )}

      {/* Reset credential modal */}
      <ResetCredentialModal
        user={resetTarget}
        onClose={() => setResetTarget(null)}
      />

      {/* Activate / Deactivate confirmation */}
      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? "Deactivate" : "Activate"}{" "}
              {toggleTarget?.fullName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive
                ? "This user will no longer be able to log in."
                : "This user will be able to log in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={
                toggleTarget?.isActive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {updateUser.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {toggleTarget?.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── User Table ────────────────────────────────────────────

interface UserTableProps {
  users: User[];
  currentUserId: string;
  onReset: (user: User) => void;
  onToggleActive: (user: User) => void;
}

function UserTable({
  users,
  currentUserId,
  onReset,
  onToggleActive,
}: UserTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className={!user.isActive ? "opacity-60" : undefined}>
              <TableCell>
                <div>
                  <p className="font-medium leading-none">{user.fullName}</p>
                  {user.mustChangePassword && (
                    <p className="mt-0.5 text-xs text-amber-600">
                      Must change {user.authType === "pin" ? "PIN" : "password"}
                    </p>
                  )}
                  {user.id === currentUserId && (
                    <p className="mt-0.5 text-xs text-muted-foreground">(you)</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.role === "owner" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "outline" : "secondary"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                {user.lastLoginAt
                  ? formatDistanceToNow(new Date(user.lastLoginAt), {
                      addSuffix: true,
                    })
                  : "Never"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                    title="Edit user"
                  >
                    <Link href={`/admin/users/${user.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onReset(user)}
                    title={`Reset ${user.authType === "pin" ? "PIN" : "password"}`}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  {user.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        user.isActive
                          ? "h-8 text-destructive hover:text-destructive"
                          : "h-8 text-muted-foreground"
                      }
                      onClick={() => onToggleActive(user)}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

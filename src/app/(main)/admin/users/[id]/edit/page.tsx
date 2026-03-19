"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useUser, useUpdateUser } from "@/hooks/use-users";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { EditUserForm } from "@/components/users/user-form";
import { toast } from "sonner";
import type { UpdateUserInput } from "@/lib/validations/users";

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isOwner, isLoading: authLoading } = useAuth();

  const { data: user, isLoading: userLoading } = useUser(id);
  const updateUser = useUpdateUser(id);

  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.replace("/dashboard");
    }
  }, [authLoading, isOwner, router]);

  if (authLoading || !isOwner) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-12 w-48" />
        <Card className="max-w-lg">
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        User not found.
      </div>
    );
  }

  const isSelf = currentUser?.userId === id;

  async function handleSubmit(data: UpdateUserInput) {
    try {
      await updateUser.mutateAsync(data);
      toast.success("User updated");
      router.push("/admin/users");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
      throw err;
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title={`Edit — ${user.fullName}`}
        description="Update user details or account status."
      />
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <EditUserForm
            user={user}
            isSelf={isSelf}
            onSubmit={handleSubmit}
            isSubmitting={updateUser.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCreateUser } from "@/hooks/use-users";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { CreateUserForm } from "@/components/users/user-form";
import { toast } from "sonner";
import type { CreateUserInput } from "@/lib/validations/users";

export default function NewUserPage() {
  const router = useRouter();
  const { isOwner, isLoading: authLoading } = useAuth();
  const createUser = useCreateUser();

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

  async function handleSubmit(data: CreateUserInput) {
    try {
      const user = await createUser.mutateAsync(data);
      toast.success(`${user.fullName} created`);
      router.push("/admin/users");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
      throw err; // keep form in submitting=false state via react-hook-form
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Add User"
        description="Create a new staff or owner account."
      />
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <CreateUserForm
            onSubmit={handleSubmit}
            isSubmitting={createUser.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

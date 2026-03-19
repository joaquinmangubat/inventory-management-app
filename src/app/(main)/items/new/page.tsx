"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCreateItem } from "@/hooks/use-items";
import { PageHeader } from "@/components/layout/page-header";
import { ItemForm } from "@/components/items/item-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import type { UpdateItemInput } from "@/lib/validations/items";

export default function NewItemPage() {
  const router = useRouter();
  const { isOwner, isLoading: authLoading } = useAuth();
  const createItem = useCreateItem();

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

  async function handleSubmit(data: UpdateItemInput) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isActive: _isActive, ...createData } = data;
    try {
      await createItem.mutateAsync(createData);
      toast.success("Item created successfully");
      router.push("/items");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create item");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Add New Item"
        description="Add a new item to the shared inventory."
      />
      <ItemForm onSubmit={handleSubmit} isSubmitting={createItem.isPending} />
    </div>
  );
}

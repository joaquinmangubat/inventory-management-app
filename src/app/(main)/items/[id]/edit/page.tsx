"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useItem, useUpdateItem } from "@/hooks/use-items";
import { PageHeader } from "@/components/layout/page-header";
import { ItemForm } from "@/components/items/item-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import type { UpdateItemInput } from "@/lib/validations/items";

export default function EditItemPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { isOwner, isLoading: authLoading } = useAuth();
  const { data: item, isLoading: itemLoading } = useItem(id);
  const updateItem = useUpdateItem(id);

  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.replace("/dashboard");
    }
  }, [authLoading, isOwner, router]);

  if (authLoading || !isOwner || itemLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
        <p>Item not found.</p>
      </div>
    );
  }

  async function handleSubmit(data: UpdateItemInput) {
    try {
      await updateItem.mutateAsync(data);
      toast.success("Item updated successfully");
      router.push("/items");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update item");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Edit Item"
        description={item.itemDescription}
      />
      <ItemForm
        item={item}
        onSubmit={handleSubmit}
        isSubmitting={updateItem.isPending}
      />
    </div>
  );
}

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AdjustmentForm } from "@/components/adjustments/adjustment-form";
import { useCreateAdjustment } from "@/hooks/use-adjustments";
import {
  ADJUSTMENT_REASONS,
  type CreateAdjustmentInput,
  type AdjustmentReason,
} from "@/lib/validations/adjustments";

function NewAdjustmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createAdjustment = useCreateAdjustment();

  const initialItemId = searchParams.get("itemId") ?? undefined;
  const rawReason = searchParams.get("reason") ?? undefined;
  const initialReason = ADJUSTMENT_REASONS.includes(rawReason as AdjustmentReason)
    ? (rawReason as AdjustmentReason)
    : undefined;

  async function handleSubmit(data: CreateAdjustmentInput) {
    try {
      await createAdjustment.mutateAsync(data);
      toast.success("Adjustment submitted for review");
      router.push("/transactions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit adjustment");
    }
  }

  return (
    <>
      <PageHeader
        title="Submit Adjustment"
        description="Request a stock correction — pending owner review"
      />
      <div className="mt-6">
        <AdjustmentForm
          initialItemId={initialItemId}
          initialReason={initialReason}
          isSubmitting={createAdjustment.isPending}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
}

export default function NewAdjustmentPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <NewAdjustmentContent />
      </Suspense>
    </div>
  );
}

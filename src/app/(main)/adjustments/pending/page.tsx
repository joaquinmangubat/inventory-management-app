"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { AdjustmentCard } from "@/components/adjustments/adjustment-card";
import { RejectReasonModal } from "@/components/adjustments/reject-reason-modal";
import { usePendingAdjustments, useApproveAdjustment, useRejectAdjustment } from "@/hooks/use-adjustments";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AdjustmentWithDetails } from "@/types/adjustments";

export default function PendingAdjustmentsPage() {
  const { isOwner, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [rejectTarget, setRejectTarget] = useState<AdjustmentWithDetails | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data, isLoading } = usePendingAdjustments();
  const approveAdjustment = useApproveAdjustment();
  const rejectAdjustment = useRejectAdjustment();

  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.replace("/dashboard");
    }
  }, [authLoading, isOwner, router]);

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      await approveAdjustment.mutateAsync(id);
      toast.success("Adjustment approved — stock updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve adjustment");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRejectConfirm(rejectionReason?: string) {
    if (!rejectTarget) return;
    try {
      await rejectAdjustment.mutateAsync({ id: rejectTarget.id, rejectionReason });
      toast.success("Adjustment rejected");
      setRejectTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject adjustment");
    }
  }

  const adjustments = data?.adjustments ?? [];

  if (authLoading || (!isOwner && !authLoading)) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader
        title="Pending Adjustments"
        description={
          isLoading
            ? "Loading..."
            : adjustments.length > 0
            ? `${adjustments.length} adjustment${adjustments.length !== 1 ? "s" : ""} awaiting review`
            : "All caught up"
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : adjustments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-base font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending adjustments to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {adjustments.map((adj) => (
              <AdjustmentCard
                key={adj.id}
                adjustment={adj}
                isApproving={approvingId === adj.id}
                onApprove={() => handleApprove(adj.id)}
                onReject={() => setRejectTarget(adj)}
              />
            ))}
          </div>
        )}
      </div>

      <RejectReasonModal
        adjustment={rejectTarget}
        isOpen={!!rejectTarget}
        isRejecting={rejectAdjustment.isPending}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}

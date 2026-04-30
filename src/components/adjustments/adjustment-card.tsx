"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdjustmentWithDetails } from "@/types/adjustments";

const REASON_COLORS: Record<string, string> = {
  Damaged: "bg-orange-100 text-orange-700",
  Expired: "bg-red-100 text-red-700",
  Miscounted: "bg-blue-100 text-blue-700",
  Spillage: "bg-purple-100 text-purple-700",
  Other: "bg-gray-100 text-gray-700",
};

interface AdjustmentCardProps {
  adjustment: AdjustmentWithDetails;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function AdjustmentCard({
  adjustment,
  isApproving,
  onApprove,
  onReject,
}: AdjustmentCardProps) {
  const qty = Number(adjustment.quantityChange);
  const currentStock = Number(adjustment.item.quantityInStock);
  const projectedStock = currentStock + qty;
  const sign = qty > 0 ? "+" : "";
  const isBrandA = adjustment.businessEntity === "Business A";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{adjustment.item.itemDescription}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted by {adjustment.loggedBy.fullName} &middot;{" "}
            {formatDistanceToNow(new Date(adjustment.timestamp), { addSuffix: true })}
          </p>
        </div>
        <Badge
          className={cn(
            "shrink-0 text-xs font-medium border-0",
            isBrandA
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          )}
        >
          {adjustment.businessEntity}
        </Badge>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-2 items-center">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            REASON_COLORS[adjustment.adjustmentReason] ?? REASON_COLORS.Other
          )}
        >
          {adjustment.adjustmentReason}
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            qty < 0 ? "text-destructive" : "text-green-600"
          )}
        >
          {sign}{qty} {adjustment.item.unitOfMeasure}
        </span>
      </div>

      {/* Stock preview */}
      <p
        className={cn(
          "text-xs",
          projectedStock < 0 ? "text-destructive font-medium" : "text-muted-foreground"
        )}
      >
        Stock: {currentStock} → {projectedStock} {adjustment.item.unitOfMeasure}
        {projectedStock < 0 && " (would go negative)"}
      </p>

      {/* Notes */}
      {adjustment.adjustmentNotes && (
        <p className="text-xs text-foreground bg-muted rounded px-3 py-2 leading-relaxed">
          {adjustment.adjustmentNotes}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          onClick={onApprove}
          disabled={isApproving}
        >
          <Check className="h-3.5 w-3.5" />
          {isApproving ? "Approving..." : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 border-destructive text-destructive hover:bg-destructive/10"
          onClick={onReject}
          disabled={isApproving}
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
    </div>
  );
}

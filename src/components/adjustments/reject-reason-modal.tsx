"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdjustmentWithDetails } from "@/types/adjustments";

interface RejectReasonModalProps {
  adjustment: AdjustmentWithDetails | null;
  isOpen: boolean;
  isRejecting: boolean;
  onClose: () => void;
  onConfirm: (rejectionReason?: string) => void;
}

export function RejectReasonModal({
  adjustment,
  isOpen,
  isRejecting,
  onClose,
  onConfirm,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(reason.trim() || undefined);
  }

  function handleClose() {
    setReason("");
    onClose();
  }

  if (!adjustment) return null;

  const qty = Number(adjustment.quantityChange);
  const sign = qty > 0 ? "+" : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject Adjustment</DialogTitle>
        </DialogHeader>

        {/* Adjustment summary */}
        <div className="rounded-md bg-muted px-4 py-3 space-y-1 text-sm">
          <p className="font-medium">{adjustment.item.itemDescription}</p>
          <p className="text-muted-foreground">
            {adjustment.adjustmentReason} &middot; {sign}{qty} {adjustment.item.unitOfMeasure}
          </p>
          <p className="text-muted-foreground">Submitted by {adjustment.loggedBy.fullName}</p>
          {adjustment.adjustmentNotes && (
            <p className="text-foreground pt-1 italic">&ldquo;{adjustment.adjustmentNotes}&rdquo;</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rejectionReason">
            Reason for rejection <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="rejectionReason"
            placeholder="Explain why this adjustment is being rejected..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isRejecting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isRejecting}
          >
            {isRejecting ? "Rejecting..." : "Reject Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

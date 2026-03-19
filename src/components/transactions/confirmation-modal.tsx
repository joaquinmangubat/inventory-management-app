"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateTransactionInput } from "@/lib/validations/transactions";
import type { ItemWithCategory } from "@/types/items";

interface ConfirmationModalProps {
  open: boolean;
  data: CreateTransactionInput | null;
  item: ItemWithCategory | null;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
  expiryAlertDays?: number;
}

export function ConfirmationModal({
  open,
  data,
  item,
  isSubmitting,
  onBack,
  onConfirm,
  expiryAlertDays = 7,
}: ConfirmationModalProps) {
  if (!data || !item) return null;

  const quantityChange = data.transactionType === "add" ? data.quantity : -data.quantity;
  const newStock = Number(item.quantityInStock) + quantityChange;
  const isNegative = newStock < 0;

  let expiryWarning: string | null = null;
  if (data.expirationDate) {
    const daysUntilExpiry = Math.ceil(
      (new Date(data.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry <= expiryAlertDays) {
      expiryWarning =
        daysUntilExpiry <= 0
          ? "This batch has already expired"
          : `This batch expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isSubmitting) onBack(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Brand</span>
              <span className="font-medium">{data.businessEntity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item</span>
              <span className="font-medium">{item.itemDescription}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Action</span>
              <span className="font-medium">
                {data.transactionType === "add" ? "Add" : "Consume"} {data.quantity} {item.unitOfMeasure}
              </span>
            </div>
            {data.expirationDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">
                  {format(new Date(data.expirationDate), "PPP")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">New stock</span>
              <span className={cn("font-medium", isNegative && "text-red-600")}>
                {newStock} {item.unitOfMeasure}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {(isNegative || expiryWarning) && (
            <div className="space-y-2">
              {isNegative && (
                <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Stock will go negative after this transaction</span>
                </div>
              )}
              {expiryWarning && (
                <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{expiryWarning}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1"
          >
            Go Back
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

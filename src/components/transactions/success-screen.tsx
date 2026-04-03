"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TransactionWithDetails } from "@/types/transactions";

interface SuccessScreenProps {
  transaction: TransactionWithDetails;
  onLogAnother: () => void;
  onDashboard: () => void;
  onEdit: (id: string) => void;
}

const EDIT_WINDOW_SECONDS = 5 * 60; // 300 seconds

export function SuccessScreen({
  transaction,
  onLogAnother,
  onDashboard,
  onEdit,
}: SuccessScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - new Date(transaction.timestamp).getTime()) / 1000);
    return Math.max(0, EDIT_WINDOW_SECONDS - elapsed);
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;

  const isBrandA = transaction.businessEntity === "Brand A";
  const brandColor = isBrandA ? "bg-red-600" : "bg-green-600";

  const quantityAbs = Math.abs(Number(transaction.quantityChange));
  const action =
    transaction.transactionType === "add"
      ? `Added ${quantityAbs}`
      : `Consumed ${quantityAbs}`;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Success icon */}
      <CheckCircle className="h-16 w-16 text-green-600" />
      <h2 className="text-xl font-semibold">Transaction Logged</h2>

      {/* Summary card */}
      <div className="w-full max-w-sm rounded-xl border overflow-hidden shadow-sm">
        {/* Brand banner */}
        <div className={cn("py-3 px-4 text-white text-center font-semibold", brandColor)}>
          {transaction.businessEntity}
        </div>

        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item</span>
            <span className="font-medium">{transaction.item.itemDescription}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Action</span>
            <span className="font-medium">
              {action} {transaction.item.unitOfMeasure}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stock after</span>
            <span
              className={cn(
                "font-medium",
                Number(transaction.stockAfterTransaction) < 0 && "text-red-600"
              )}
            >
              {Number(transaction.stockAfterTransaction)} {transaction.item.unitOfMeasure}
            </span>
          </div>
          {transaction.expirationDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium">
                {format(new Date(transaction.expirationDate), "PPP")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Edit countdown button */}
      {secondsLeft > 0 && (
        <Button
          variant="outline"
          onClick={() => onEdit(transaction.id)}
          className="gap-2"
        >
          Edit
          <span className="text-xs text-muted-foreground">({timeLabel} remaining)</span>
        </Button>
      )}

      {/* Navigation actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onLogAnother}
        >
          Log Another Transaction
        </Button>
        <Button className="flex-1" onClick={onDashboard}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

"use client";

import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TransactionWithDetails } from "@/types/transactions";

interface TransactionCardProps {
  transaction: TransactionWithDetails;
  currentUserId: string;
  expiryAlertDays?: number;
}

const EDIT_WINDOW_MS = 5 * 60 * 1000;

function TypeBadge({ type }: { type: string }) {
  if (type === "add") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Add</Badge>;
  }
  if (type === "consume") {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Consume</Badge>;
  }
  // adjustment variants
  if (type === "adjust_pending") {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Adjustment · Pending</Badge>;
  }
  if (type === "adjust_approved") {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Adjustment · Approved</Badge>;
  }
  if (type === "adjust_rejected") {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Adjustment · Rejected</Badge>;
  }
  return <Badge variant="outline">{type}</Badge>;
}

function BrandBadge({ brand }: { brand: string }) {
  const isBrandA = brand === "Brand A";
  return (
    <Badge
      className={cn(
        "hover:opacity-100",
        isBrandA
          ? "bg-red-600 text-white hover:bg-red-600"
          : "bg-green-600 text-white hover:bg-green-600"
      )}
    >
      {brand}
    </Badge>
  );
}

function ExpiryBadge({
  date,
  expiryAlertDays,
}: {
  date: string;
  expiryAlertDays: number;
}) {
  const expiry = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return (
      <span className="text-xs font-medium text-red-600">
        Expired {format(expiry, "MMM d, yyyy")}
      </span>
    );
  }
  if (daysUntil <= expiryAlertDays) {
    return (
      <span className="text-xs font-medium text-amber-600">
        Expires {format(expiry, "MMM d, yyyy")} ({daysUntil}d)
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-green-700">
      Expires {format(expiry, "MMM d, yyyy")}
    </span>
  );
}

export function TransactionCard({
  transaction: tx,
  currentUserId,
  expiryAlertDays = 7,
}: TransactionCardProps) {
  const router = useRouter();

  const msSinceCreation = Date.now() - new Date(tx.timestamp).getTime();
  const isAdjustment = tx.transactionType.startsWith("adjust_");
  const canEdit =
    msSinceCreation < EDIT_WINDOW_MS &&
    tx.loggedByUserId === currentUserId &&
    !isAdjustment;

  const quantityChange = Number(tx.quantityChange);
  const stockAfter = Number(tx.stockAfterTransaction);
  const isPositive = quantityChange > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Top row: badges + edit button */}
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={tx.transactionType} />
        <BrandBadge brand={tx.businessEntity} />
        {tx.editedAt && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Edited
          </Badge>
        )}
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1.5 h-7 text-xs"
            onClick={() => router.push(`/transactions/${tx.id}/edit`)}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        )}
      </div>

      {/* Item name + quantity */}
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium leading-tight">{tx.item.itemDescription}</span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums shrink-0",
            isPositive ? "text-green-700" : "text-red-600"
          )}
        >
          {isPositive ? "+" : ""}
          {quantityChange} {tx.item.unitOfMeasure}
        </span>
      </div>

      {/* Stock after */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Stock after:{" "}
          <span className={cn("font-medium", stockAfter < 0 ? "text-red-600" : "text-foreground")}>
            {stockAfter} {tx.item.unitOfMeasure}
          </span>
        </span>
      </div>

      {/* Expiry date — only on add transactions */}
      {tx.expirationDate && tx.transactionType === "add" && (
        <ExpiryBadge date={tx.expirationDate} expiryAlertDays={expiryAlertDays} />
      )}

      {/* Notes preview */}
      {tx.notes && (
        <p className="text-xs text-muted-foreground italic truncate">{tx.notes}</p>
      )}

      {/* Adjustment notes + reason */}
      {isAdjustment && tx.adjustmentNotes && (
        <div className="space-y-0.5">
          {tx.adjustmentReason && (
            <p className="text-xs font-medium text-muted-foreground">
              Reason: {tx.adjustmentReason}
            </p>
          )}
          <p className="text-xs text-muted-foreground italic truncate">{tx.adjustmentNotes}</p>
        </div>
      )}

      {/* Rejection reason for rejected adjustments */}
      {tx.transactionType === "adjust_rejected" && tx.rejectionReason && (
        <p className="text-xs text-red-600">
          Rejected: {tx.rejectionReason}
        </p>
      )}

      {/* Footer: user + timestamp */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
        <span>{tx.loggedBy.fullName}</span>
        <span title={format(new Date(tx.timestamp), "PPPp")}>
          {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

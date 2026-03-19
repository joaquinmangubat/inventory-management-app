"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";
import { BusinessBadge } from "@/components/shared/business-badge";
import type { ItemWithCategory } from "@/types/items";

interface ItemCardProps {
  item: ItemWithCategory;
  earliestExpiry?: string | null;
}

function StockStatusBadge({ item }: { item: ItemWithCategory }) {
  const stock = Number(item.quantityInStock);
  const reorder = Number(item.reorderLevel);

  if (stock <= 0) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }
  if (reorder > 0 && stock <= reorder) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Low Stock
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      OK
    </Badge>
  );
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ItemCard({ item, earliestExpiry }: ItemCardProps) {
  const qty = Number(item.quantityInStock);
  const cost = Number(item.currentUnitCostPhp);
  const reorder = Number(item.reorderLevel);
  const value = qty * cost;

  const stockDisplay = item.allowsDecimal ? qty.toFixed(2) : qty.toFixed(0);
  const reorderDisplay = reorder.toFixed(0);

  // Progress: qty vs reorder level (capped at 200% to avoid huge bars)
  const progressValue =
    reorder > 0 ? Math.min((qty / reorder) * 100, 200) : 100;

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Top badges row */}
        <div className="flex flex-wrap items-center gap-1">
          <BusinessBadge business={item.primaryBusiness} />
          <StockStatusBadge item={item} />
        </div>

        {/* Item name + category */}
        <div>
          <p className="font-semibold leading-tight">{item.itemDescription}</p>
          <p className="text-xs text-muted-foreground">{item.category.name}</p>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Stock + cost */}
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">
            Stock:{" "}
            <span className="font-medium text-foreground">
              {stockDisplay} {item.unitOfMeasure}
            </span>
          </span>
          <span className="text-muted-foreground">
            ₱{cost.toFixed(2)}/{item.unitOfMeasure}
          </span>
        </div>

        {/* Total value */}
        <div className="text-sm">
          <span className="text-muted-foreground">Value: </span>
          <span className="font-medium">₱{value.toFixed(2)}</span>
        </div>

        {/* Reorder level + progress bar */}
        {reorder > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Reorder: {reorderDisplay}</span>
              <span>{qty.toFixed(0)} / {reorderDisplay}</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        )}

        {/* Expiry warning */}
        {item.tracksExpiration && earliestExpiry && (
          <div className="flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>Expires: {formatDate(earliestExpiry)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

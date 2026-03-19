"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, Calendar, DollarSign } from "lucide-react";
import type { ItemWithCategory } from "@/types/items";

interface StockSummaryBarProps {
  activeItems: ItemWithCategory[];
  expiringCount: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: "amber" | "default";
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={
            accent === "amber"
              ? "rounded-full bg-yellow-100 p-2 text-yellow-700 shrink-0"
              : "rounded-full bg-muted p-2 text-muted-foreground shrink-0"
          }
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={
              accent === "amber"
                ? "text-base font-bold text-yellow-700 break-words"
                : "text-base font-bold break-words"
            }
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StockSummaryBar({
  activeItems,
  expiringCount,
}: StockSummaryBarProps) {
  const totalItems = activeItems.length;

  const lowStockCount = activeItems.filter((item) => {
    const qty = Number(item.quantityInStock);
    const reorder = Number(item.reorderLevel);
    return reorder > 0 && qty > 0 && qty <= reorder;
  }).length;

  const totalValue = activeItems.reduce((sum, item) => {
    return sum + Number(item.quantityInStock) * Number(item.currentUnitCostPhp);
  }, 0);

  const formattedValue = `₱${totalValue.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        icon={<Package className="h-4 w-4" />}
        label="Total Items"
        value={totalItems}
      />
      <StatCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Low Stock"
        value={lowStockCount}
        accent={lowStockCount > 0 ? "amber" : "default"}
      />
      <StatCard
        icon={<Calendar className="h-4 w-4" />}
        label="Expiring Soon"
        value={expiringCount}
        accent={expiringCount > 0 ? "amber" : "default"}
      />
      <StatCard
        icon={<DollarSign className="h-4 w-4" />}
        label="Total Value"
        value={formattedValue}
      />
    </div>
  );
}

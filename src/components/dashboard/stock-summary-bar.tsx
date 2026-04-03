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
  accent?: "blue" | "orange" | "yellow" | "green" | "default";
}

const accentStyles: Record<NonNullable<StatCardProps["accent"]>, { icon: string; value: string }> = {
  blue:    { icon: "rounded-full bg-blue-100 p-2 text-blue-600 shrink-0",   value: "text-base font-bold break-words" },
  orange:  { icon: "rounded-full bg-orange-100 p-2 text-orange-500 shrink-0", value: "text-base font-bold text-orange-500 break-words" },
  yellow:  { icon: "rounded-full bg-yellow-100 p-2 text-yellow-600 shrink-0", value: "text-base font-bold text-yellow-600 break-words" },
  green:   { icon: "rounded-full bg-green-100 p-2 text-green-700 shrink-0",  value: "text-base font-bold break-words" },
  default: { icon: "rounded-full bg-muted p-2 text-muted-foreground shrink-0", value: "text-base font-bold break-words" },
};

function StatCard({ icon, label, value, accent = "default" }: StatCardProps) {
  const styles = accentStyles[accent];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={styles.icon}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={styles.value}>{value}</p>
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
        accent="blue"
      />
      <StatCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="Low Stock"
        value={lowStockCount}
        accent={lowStockCount > 0 ? "orange" : "default"}
      />
      <StatCard
        icon={<Calendar className="h-4 w-4" />}
        label="Expiring Soon"
        value={expiringCount}
        accent={expiringCount > 0 ? "yellow" : "default"}
      />
      <StatCard
        icon={<DollarSign className="h-4 w-4" />}
        label="Total Value"
        value={formattedValue}
        accent="green"
      />
    </div>
  );
}

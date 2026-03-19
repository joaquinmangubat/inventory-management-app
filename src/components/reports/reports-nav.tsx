"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type ActiveTab = "consumption" | "low-stock" | "cost-allocation";

interface ReportsNavProps {
  active: ActiveTab;
}

export function ReportsNav({ active }: ReportsNavProps) {
  const { isOwner } = useAuth();

  return (
    <div className="flex gap-0 border-b mb-6">
      {isOwner && (
        <Link
          href="/reports/consumption"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === "consumption"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Consumption
        </Link>
      )}
      <Link
        href="/reports/low-stock"
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
          active === "low-stock"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        Low Stock
      </Link>
      {isOwner && (
        <Link
          href="/reports/cost-allocation"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === "cost-allocation"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Cost Allocation
        </Link>
      )}
    </div>
  );
}

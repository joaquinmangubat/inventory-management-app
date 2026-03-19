"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useItems } from "@/hooks/use-items";
import { useCategories } from "@/hooks/use-categories";
import { useExpiringItems } from "@/hooks/use-expiring-items";
import { useDebounce } from "@/hooks/use-debounce";
import { PageHeader } from "@/components/layout/page-header";
import { StockSummaryBar } from "@/components/dashboard/stock-summary-bar";
import { ItemCard } from "@/components/dashboard/item-card";
import { ExpiringSoonSection } from "@/components/dashboard/expiring-soon-section";
import { InactiveItemsSection } from "@/components/dashboard/inactive-items-section";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, PackageOpen } from "lucide-react";
import type { ExpiringItem } from "@/types/items";

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-28" />
          <div className="space-y-1">
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { isOwner } = useAuth();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const { data: allItems = [], isLoading: itemsLoading } = useItems({
    search: debouncedSearch,
    categoryId,
    showInactive: true,
  });

  const { data: categories = [] } = useCategories();
  const { data: expiringItems = [] } = useExpiringItems();

  const activeItems = allItems.filter((item) => item.isActive);
  const inactiveItems = allItems.filter((item) => !item.isActive);

  // Build a map of itemId → earliestExpiry for active items
  const expiryMap = new Map<string, string>(
    (expiringItems as ExpiringItem[]).map((e) => [e.id, e.earliestExpiry])
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Dashboard"
        description="Stock overview across both brands"
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={categoryId || "all"}
          onValueChange={(val) => setCategoryId(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary bar */}
      <StockSummaryBar
        activeItems={activeItems}
        expiringCount={expiringItems.length}
      />

      {/* Expiring Soon */}
      <ExpiringSoonSection items={expiringItems as ExpiringItem[]} />

      {/* Item card grid */}
      {itemsLoading ? (
        <SkeletonGrid />
      ) : activeItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <PackageOpen className="mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm">No items found.</p>
          <p className="text-xs">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              earliestExpiry={expiryMap.get(item.id) ?? null}
            />
          ))}
        </div>
      )}

      {/* Inactive Items */}
      <InactiveItemsSection items={inactiveItems} isOwner={isOwner} />
    </div>
  );
}

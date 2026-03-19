"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useItems } from "@/hooks/use-items";
import { useCategories } from "@/hooks/use-categories";
import { PageHeader } from "@/components/layout/page-header";
import { ItemsTable } from "@/components/items/items-table";
import { UpdatePriceModal } from "@/components/items/update-price-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Search, Loader2 } from "lucide-react";
import type { ItemWithCategory } from "@/types/items";
import { useEffect, useRef } from "react";

export default function ItemsPage() {
  const router = useRouter();
  const { isOwner, isLoading: authLoading } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [priceModalItem, setPriceModalItem] = useState<ItemWithCategory | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const { data: items = [], isLoading: itemsLoading } = useItems({
    search: debouncedSearch,
    categoryId,
    showInactive,
  });

  const { data: categories = [] } = useCategories();

  const handleOpenPriceModal = useCallback((item: ItemWithCategory) => {
    setPriceModalItem(item);
  }, []);

  // Redirect non-owners after auth resolves
  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.replace("/dashboard");
    }
  }, [authLoading, isOwner, router]);

  if (authLoading || !isOwner) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader title="Item Management" description="Manage inventory items for both brands.">
        <Button onClick={() => router.push("/items/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </PageHeader>

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

        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
            Show Inactive
          </Label>
        </div>
      </div>

      {/* Summary count */}
      <p className="text-sm text-muted-foreground">
        {itemsLoading ? "Loading..." : `${items.length} item${items.length !== 1 ? "s" : ""}`}
      </p>

      {/* Table */}
      {itemsLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ItemsTable items={items} onUpdatePrice={handleOpenPriceModal} />
      )}

      {/* Update Price Modal */}
      <UpdatePriceModal
        item={priceModalItem}
        open={!!priceModalItem}
        onClose={() => setPriceModalItem(null)}
      />
    </div>
  );
}

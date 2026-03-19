"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, DollarSign, PowerOff, Power, AlertCircle } from "lucide-react";
import { useDeactivateItem, useActivateItem } from "@/hooks/use-items";
import type { ItemWithCategory } from "@/types/items";
import { toast } from "sonner";
import { BusinessBadge } from "@/components/shared/business-badge";

interface ItemsTableProps {
  items: ItemWithCategory[];
  onUpdatePrice: (item: ItemWithCategory) => void;
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


export function ItemsTable({ items, onUpdatePrice }: ItemsTableProps) {
  const deactivate = useDeactivateItem();
  const activate = useActivateItem();

  async function handleDeactivate(item: ItemWithCategory) {
    try {
      await deactivate.mutateAsync(item.id);
      toast.success(`"${item.itemDescription}" deactivated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate item");
    }
  }

  async function handleActivate(item: ItemWithCategory) {
    try {
      await activate.mutateAsync(item.id);
      toast.success(`"${item.itemDescription}" reactivated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate item");
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <AlertCircle className="mb-3 h-8 w-8 opacity-40" />
        <p className="text-sm">No items found.</p>
        <p className="text-xs">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Cost (PHP)</TableHead>
            <TableHead className="text-right">Value (PHP)</TableHead>
            <TableHead className="text-right">Reorder</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const cost = Number(item.currentUnitCostPhp);
            const stock = Number(item.quantityInStock);
            const value = cost * stock;

            return (
              <TableRow
                key={item.id}
                className={!item.isActive ? "opacity-60" : undefined}
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium leading-tight">
                      {item.itemDescription}
                    </span>
                    <div className="flex gap-1">
                      <BusinessBadge business={item.primaryBusiness} />
                      {!item.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.category.name}
                </TableCell>
                <TableCell className="text-sm">{item.unitOfMeasure}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium">
                      {item.allowsDecimal
                        ? stock.toFixed(2)
                        : stock.toFixed(0)}
                    </span>
                    <StockStatusBadge item={item} />
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">
                  ₱{cost.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  ₱{value.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {Number(item.reorderLevel).toFixed(0)}
                </TableCell>
                <TableCell>
                  {item.isActive ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild title="Edit item">
                      <Link href={`/items/${item.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Update price"
                      onClick={() => onUpdatePrice(item)}
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    {item.isActive ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Deactivate item"
                        onClick={() => handleDeactivate(item)}
                        disabled={deactivate.isPending}
                      >
                        <PowerOff className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reactivate item"
                        onClick={() => handleActivate(item)}
                        disabled={activate.isPending}
                      >
                        <Power className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

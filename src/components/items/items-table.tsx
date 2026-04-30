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
import { Pencil, DollarSign, PowerOff, Power, AlertCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <>
      {/* Mobile card list — hidden on md+ */}
      <div className="space-y-2 md:hidden">
        {items.map((item) => {
          const cost = Number(item.currentUnitCostPhp);
          const stock = Number(item.quantityInStock);
          const value = cost * stock;

          return (
            <div
              key={item.id}
              className={`rounded-lg border bg-card p-4 shadow-sm${!item.isActive ? " opacity-60" : ""}`}
            >
              {/* Name + badges */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="font-medium leading-tight">{item.itemDescription}</span>
                  <div className="flex flex-wrap gap-1">
                    <BusinessBadge business={item.primaryBusiness} />
                    {!item.isActive && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </div>
                <StockStatusBadge item={item} />
              </div>

              {/* Meta row */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{item.category.name}</span>
                <span>{item.unitOfMeasure}</span>
                <span>
                  Stock:{" "}
                  <span className="font-medium text-foreground">
                    {item.allowsDecimal ? stock.toFixed(2) : stock.toFixed(0)}
                  </span>
                </span>
                <span>
                  Reorder:{" "}
                  <span className="font-medium text-foreground">
                    {Number(item.reorderLevel).toFixed(0)}
                  </span>
                </span>
              </div>

              {/* Cost / Value row */}
              <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                <span>
                  Cost:{" "}
                  <span className="font-medium text-foreground">₱{cost.toFixed(2)}</span>
                </span>
                <span>
                  Value:{" "}
                  <span className="font-medium text-foreground">₱{value.toFixed(2)}</span>
                </span>
              </div>

              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" asChild>
                  <Link href={`/items/${item.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs"
                  onClick={() => onUpdatePrice(item)}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Update Price
                </Button>
                {item.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDeactivate(item)}
                    disabled={deactivate.isPending}
                  >
                    <PowerOff className="h-3.5 w-3.5" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs text-green-600 hover:text-green-700"
                    onClick={() => handleActivate(item)}
                    disabled={activate.isPending}
                  >
                    <Power className="h-3.5 w-3.5" />
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table — hidden below md */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Stock Status</TableHead>
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
                    <span className="text-sm font-medium">
                      {item.allowsDecimal ? stock.toFixed(2) : stock.toFixed(0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StockStatusBadge item={item} />
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
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/items/${item.id}/edit`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit item
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdatePrice(item)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Update price
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {item.isActive ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeactivate(item)}
                              disabled={deactivate.isPending}
                            >
                              <PowerOff className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-green-600 focus:text-green-600"
                              onClick={() => handleActivate(item)}
                              disabled={activate.isPending}
                            >
                              <Power className="mr-2 h-4 w-4" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

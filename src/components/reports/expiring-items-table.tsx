"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExpiringItem } from "@/types/reports";

interface ExpiringItemsTableProps {
  items: ExpiringItem[];
}

export function ExpiringItemsTable({ items }: ExpiringItemsTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead className="text-right">Days Remaining</TableHead>
            <TableHead className="text-right">In Stock</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isExpired = item.status === "expired";
            const dateLabel = new Date(
              item.expirationDate + "T00:00:00"
            ).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <TableRow key={`${item.id}-${item.expirationDate}`}>
                <TableCell className="font-medium">{item.itemDescription}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.categoryName}
                </TableCell>
                <TableCell className="text-sm">{dateLabel}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      isExpired ? "font-bold text-red-600" : "font-medium text-amber-600"
                    }
                  >
                    {isExpired
                      ? `${Math.abs(item.daysRemaining)}d ago`
                      : `${item.daysRemaining}d`}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {item.quantityInStock} {item.unitOfMeasure}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      isExpired
                        ? "bg-red-100 text-red-700 border-red-200"
                        : "bg-amber-100 text-amber-700 border-amber-200"
                    }
                  >
                    {isExpired ? "Expired" : "Expiring Soon"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

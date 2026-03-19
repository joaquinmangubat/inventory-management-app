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
import type { LowStockItem } from "@/types/reports";

const severityConfig = {
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
  low: { label: "Low", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  healthy: { label: "Healthy", className: "bg-green-100 text-green-700 border-green-200" },
};

interface LowStockTableProps {
  items: LowStockItem[];
}

export function LowStockTable({ items }: LowStockTableProps) {
  const severityOrder = { critical: 0, low: 1, healthy: 2 };
  const sorted = [...items].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">In Stock</TableHead>
            <TableHead className="text-right">Reorder Level</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((item) => {
            const cfg = severityConfig[item.severity];
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemDescription}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.categoryName}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      item.severity === "critical" ? "font-bold text-red-600" : undefined
                    }
                  >
                    {item.quantityInStock} {item.unitOfMeasure}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {item.reorderLevel > 0
                    ? `${item.reorderLevel} ${item.unitOfMeasure}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cfg.className}>
                    {cfg.label}
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

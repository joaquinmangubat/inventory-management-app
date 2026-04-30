"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsNav } from "@/components/reports/reports-nav";
import { DateRangeSelector, getDefaultRange } from "@/components/reports/date-range-selector";
import { ExportButton } from "@/components/reports/export-button";
import { CostAllocationChart } from "@/components/reports/cost-allocation-chart";
import { useCostAllocationReport } from "@/hooks/use-reports";
import { useAuth } from "@/hooks/use-auth";
import type { DateRange, DatePreset } from "@/types/reports";

const fmt = (v: number) =>
  `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CostAllocationPage() {
  const { isOwner, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [range, setRange] = useState<DateRange>(getDefaultRange);
  const [preset, setPreset] = useState<DatePreset>("last-30");

  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.replace("/reports/low-stock");
    }
  }, [authLoading, isOwner, router]);

  const { data, isLoading } = useCostAllocationReport({
    from: range.from,
    to: range.to,
  });

  if (authLoading || (!isOwner && !authLoading)) return null;

  const exportHeaders = [
    { key: "categoryName", label: "Category" },
    { key: "arcysCost", label: "Business A (PHP)" },
    { key: "baleCost", label: "Business B (PHP)" },
    { key: "totalCost", label: "Total (PHP)" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Reports" />
      <ReportsNav active="cost-allocation" />

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-end sm:flex-wrap">
        <DateRangeSelector
          range={range}
          preset={preset}
          onRangeChange={(r, p) => {
            setRange(r);
            setPreset(p);
          }}
        />
        <div className="ml-auto">
          <ExportButton
            filename={`cost-allocation-${range.from}-to-${range.to}.csv`}
            rows={data?.byCategory ?? []}
            headers={exportHeaders}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : !data || data.byCategory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <p className="text-base font-medium text-muted-foreground">No data for this period</p>
          <p className="text-sm text-muted-foreground">Try adjusting the date range.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Business A</p>
                <p className="text-xl font-bold text-red-600">
                  {fmt(data.summary.arcysTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Business B</p>
                <p className="text-xl font-bold text-green-600">
                  {fmt(data.summary.baleTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Combined</p>
                <p className="text-xl font-bold">{fmt(data.summary.combinedTotal)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Bar chart */}
          <CostAllocationChart byCategory={data.byCategory} />

          {/* Detail table */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              By Category
            </h2>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right text-red-600">Business A</TableHead>
                    <TableHead className="text-right text-green-600">Business B</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byCategory.map((row) => (
                    <TableRow key={row.categoryName}>
                      <TableCell className="font-medium">{row.categoryName}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(row.arcysCost)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(row.baleCost)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(row.totalCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right text-red-600">
                      {fmt(data.summary.arcysTotal)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {fmt(data.summary.baleTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(data.summary.combinedTotal)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

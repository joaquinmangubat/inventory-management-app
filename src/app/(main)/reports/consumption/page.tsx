"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ConsumptionChart } from "@/components/reports/consumption-chart";
import { useConsumptionReport } from "@/hooks/use-reports";
import { useCategories } from "@/hooks/use-categories";
import { useAuth } from "@/hooks/use-auth";
import type { DateRange, DatePreset } from "@/types/reports";

const fmt = (v: number) =>
  `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ConsumptionReportPage() {
  const { isOwner, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [range, setRange] = useState<DateRange>(getDefaultRange);
  const [preset, setPreset] = useState<DatePreset>("last-30");
  const [businessEntity, setBusinessEntity] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !isOwner) {
      router.replace("/reports/low-stock");
    }
  }, [authLoading, isOwner, router]);

  const filters = {
    from: range.from,
    to: range.to,
    businessEntity: businessEntity === "all" ? undefined : businessEntity,
    categoryId: categoryId === "all" ? undefined : categoryId,
  };

  const { data, isLoading } = useConsumptionReport(filters);
  const { data: categories } = useCategories();

  if (authLoading || (!isOwner && !authLoading)) return null;

  const exportHeaders = [
    { key: "itemDescription", label: "Item" },
    { key: "categoryName", label: "Category" },
    { key: "businessEntity", label: "Brand" },
    { key: "totalQuantity", label: "Qty Consumed" },
    { key: "unitOfMeasure", label: "Unit" },
    { key: "totalCost", label: "Total Cost (PHP)" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Reports" />
      <ReportsNav active="consumption" />

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
        <div className="flex gap-2">
          <Select value={businessEntity} onValueChange={setBusinessEntity}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="Brand A">Brand A</SelectItem>
              <SelectItem value="Brand B">Brand B</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <ExportButton
            filename={`consumption-${range.from}-to-${range.to}.csv`}
            rows={data?.rows ?? []}
            headers={exportHeaders}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-52 rounded-lg" />
            <Skeleton className="h-52 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <p className="text-base font-medium text-muted-foreground">No data for this period</p>
          <p className="text-sm text-muted-foreground">Try adjusting the date range or filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.byBusiness.map((b) => (
              <Card key={b.businessEntity}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">{b.businessEntity}</p>
                  <p
                    className="text-xl font-bold"
                    style={{
                      color:
                        b.businessEntity === "Brand A" ? "#DC2626" : "#16A34A",
                    }}
                  >
                    {fmt(b.totalCost)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.transactionCount} transaction{b.transactionCount !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Combined</p>
                <p className="text-xl font-bold">
                  {fmt(data.byBusiness.reduce((s, b) => s + b.totalCost, 0))}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.rows.length} item{data.rows.length !== 1 ? "s" : ""} consumed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <ConsumptionChart report={data} />

          {/* Detail table */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Detail
            </h2>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-right">Qty Consumed</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.itemDescription}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.categoryName}
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color:
                              row.businessEntity === "Brand A"
                                ? "#DC2626"
                                : "#16A34A",
                          }}
                        >
                          {row.businessEntity === "Brand A" ? "Brand A" : "Brand B"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.totalQuantity} {row.unitOfMeasure}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fmt(row.totalCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

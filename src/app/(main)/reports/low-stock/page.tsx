"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsNav } from "@/components/reports/reports-nav";
import { ExportButton } from "@/components/reports/export-button";
import { LowStockTable } from "@/components/reports/low-stock-table";
import { ExpiringItemsTable } from "@/components/reports/expiring-items-table";
import { useLowStockReport } from "@/hooks/use-reports";
import { cn } from "@/lib/utils";

type ActiveTab = "low-stock" | "expiring";

export default function LowStockReportPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("low-stock");
  const { data, isLoading } = useLowStockReport();

  const lowStockExportHeaders = [
    { key: "itemDescription", label: "Item" },
    { key: "categoryName", label: "Category" },
    { key: "quantityInStock", label: "In Stock" },
    { key: "unitOfMeasure", label: "Unit" },
    { key: "reorderLevel", label: "Reorder Level" },
    { key: "severity", label: "Status" },
  ];

  const expiringExportHeaders = [
    { key: "itemDescription", label: "Item" },
    { key: "categoryName", label: "Category" },
    { key: "expirationDate", label: "Expiry Date" },
    { key: "daysRemaining", label: "Days Remaining" },
    { key: "quantityInStock", label: "In Stock" },
    { key: "unitOfMeasure", label: "Unit" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Reports" />
      <ReportsNav active="low-stock" />

      {/* Inner tabs */}
      <div className="flex gap-0 border-b mb-6">
        <button
          onClick={() => setActiveTab("low-stock")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "low-stock"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Low Stock
          {data && data.lowStock.summary.critical + data.lowStock.summary.low > 0 && (
            <span className="ml-1.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold px-1.5 py-0.5">
              {data.lowStock.summary.critical + data.lowStock.summary.low}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("expiring")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "expiring"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Expiring Items
          {data &&
            data.expiringItems.summary.expired + data.expiringItems.summary.expiringSoon > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5">
                {data.expiringItems.summary.expired + data.expiringItems.summary.expiringSoon}
              </span>
            )}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : !data ? null : activeTab === "low-stock" ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <div className="rounded-full bg-red-100 p-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Critical</p>
                  <p className="text-xl font-bold text-red-600">
                    {data.lowStock.summary.critical}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <div className="rounded-full bg-yellow-100 p-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Low</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {data.lowStock.summary.low}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <div className="rounded-full bg-green-100 p-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Healthy</p>
                  <p className="text-xl font-bold text-green-600">
                    {data.lowStock.summary.healthy}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export + table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {data.lowStock.items.length} item{data.lowStock.items.length !== 1 ? "s" : ""}
              </p>
              <ExportButton
                filename="low-stock-report.csv"
                rows={data.lowStock.items}
                headers={lowStockExportHeaders}
              />
            </div>
            <LowStockTable items={data.lowStock.items} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <div className="rounded-full bg-red-100 p-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expired</p>
                  <p className="text-xl font-bold text-red-600">
                    {data.expiringItems.summary.expired}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiring Soon</p>
                  <p className="text-xl font-bold text-amber-600">
                    {data.expiringItems.summary.expiringSoon}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export + table */}
          {data.expiringItems.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="text-base font-medium">No expiring items</p>
              <p className="text-sm text-muted-foreground">
                No items are expired or expiring within the alert window.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {data.expiringItems.items.length} item
                  {data.expiringItems.items.length !== 1 ? "s" : ""}
                </p>
                <ExportButton
                  filename="expiring-items-report.csv"
                  rows={data.expiringItems.items}
                  headers={expiringExportHeaders}
                />
              </div>
              <ExpiringItemsTable items={data.expiringItems.items} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

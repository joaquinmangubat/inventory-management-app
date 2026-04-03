export interface DateRange {
  from: string;
  to: string;
}

export type DatePreset = "this-week" | "this-month" | "last-30" | "custom";

// ─── Consumption Report ───────────────────────────────────

export interface ConsumptionFilters {
  from: string;
  to: string;
  businessEntity?: string;
  categoryId?: string;
}

export interface ConsumptionByBusiness {
  businessEntity: string;
  totalQuantity: number;
  totalCost: number;
  transactionCount: number;
}

export interface ConsumptionByCategory {
  categoryId: string;
  categoryName: string;
  totalCost: number;
}

export interface ConsumptionByDate {
  date: string;
  brandACost: number;
  brandBCost: number;
}

export interface ConsumptionRow {
  itemId: string;
  itemDescription: string;
  unitOfMeasure: string;
  categoryName: string;
  businessEntity: string;
  totalQuantity: number;
  totalCost: number;
}

export interface ConsumptionReport {
  byBusiness: ConsumptionByBusiness[];
  byCategory: ConsumptionByCategory[];
  byDate: ConsumptionByDate[];
  rows: ConsumptionRow[];
}

// ─── Cost Allocation Report ───────────────────────────────

export interface CostAllocationFilters {
  from: string;
  to: string;
}

export interface CostAllocationSummary {
  brandATotal: number;
  brandBTotal: number;
  combinedTotal: number;
}

export interface CostAllocationByCategory {
  categoryName: string;
  arcysCost: number;
  baleCost: number;
  totalCost: number;
}

export interface CostAllocationReport {
  summary: CostAllocationSummary;
  byCategory: CostAllocationByCategory[];
}

// ─── Low Stock Report ─────────────────────────────────────

export type StockSeverity = "critical" | "low" | "healthy";

export type ExpiryStatus = "expired" | "expiring_soon";

export interface LowStockItem {
  id: string;
  itemDescription: string;
  categoryName: string;
  quantityInStock: number;
  reorderLevel: number;
  currentUnitCostPhp: number;
  unitOfMeasure: string;
  severity: StockSeverity;
}

export interface ExpiringItem {
  id: string;
  itemDescription: string;
  categoryName: string;
  quantityInStock: number;
  unitOfMeasure: string;
  expirationDate: string;
  daysRemaining: number;
  status: ExpiryStatus;
}

export interface LowStockReport {
  lowStock: {
    summary: { critical: number; low: number; healthy: number };
    items: LowStockItem[];
  };
  expiringItems: {
    summary: { expired: number; expiringSoon: number };
    items: ExpiringItem[];
  };
}

import type { BusinessEntity } from "./transactions";
import type { AdjustmentReason } from "@/lib/validations/adjustments";

export type AdjustmentStatus = "pending" | "approved" | "rejected";

export interface AdjustmentWithDetails {
  id: string;
  itemId: string;
  businessEntity: BusinessEntity;
  transactionType: "adjust_pending" | "adjust_approved" | "adjust_rejected";
  quantityChange: number;
  stockAfterTransaction: number;
  unitCostAtTransaction: number;
  timestamp: string;
  loggedByUserId: string;
  adjustmentReason: AdjustmentReason;
  adjustmentNotes: string;
  approvedByUserId: string | null;
  approvalTimestamp: string | null;
  rejectionReason: string | null;
  status: AdjustmentStatus;
  item: {
    id: string;
    itemDescription: string;
    unitOfMeasure: string;
    allowsDecimal: boolean;
    quantityInStock: number;
    currentUnitCostPhp: number;
  };
  loggedBy: {
    id: string;
    fullName: string;
  };
  approvedBy: {
    id: string;
    fullName: string;
  } | null;
}

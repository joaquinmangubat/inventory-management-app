export type TransactionType =
  | "add"
  | "consume"
  | "adjust_pending"
  | "adjust_approved"
  | "adjust_rejected";
export type BusinessEntity = "Arcy's Kitchen" | "Bale Kapampangan";

export interface Transaction {
  id: string;
  itemId: string;
  businessEntity: BusinessEntity;
  transactionType: TransactionType;
  quantityChange: number;
  stockAfterTransaction: number;
  unitCostAtTransaction: number;
  timestamp: string;
  loggedByUserId: string;
  notes: string | null;
  expirationDate: string | null;
  editedAt: string | null;
  editedByUserId: string | null;
  originalBusinessEntity: string | null;
  rejectionReason: string | null;
}

export interface TransactionWithDetails extends Transaction {
  adjustmentReason: string | null;
  adjustmentNotes: string | null;
  item: {
    id: string;
    itemDescription: string;
    unitOfMeasure: string;
    allowsDecimal: boolean;
    tracksExpiration: boolean;
    currentUnitCostPhp: number;
    quantityInStock: number;
  };
  loggedBy: {
    id: string;
    fullName: string;
  };
  editedBy: {
    id: string;
    fullName: string;
  } | null;
}

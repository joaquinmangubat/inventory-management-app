export type ItemPrimaryBusiness = "business_a" | "business_b" | "shared";

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithCount extends Category {
  _count: { items: number };
}

export interface Item {
  id: string;
  categoryId: string;
  itemDescription: string;
  unitOfMeasure: string;
  allowsDecimal: boolean;
  tracksExpiration: boolean;
  quantityInStock: number;
  currentUnitCostPhp: number;
  reorderLevel: number;
  inventoryLogType: string | null;
  orderCode: string | null;
  primaryBusiness: ItemPrimaryBusiness | null;
  primarySupplier: string | null;
  alternativeSuppliers: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
}

export interface ItemWithCategory extends Item {
  category: Category;
}

export interface ExpiringItem {
  id: string;
  itemDescription: string;
  categoryId: string;
  category: { name: string };
  earliestExpiry: string; // ISO date string (YYYY-MM-DD)
  expiryStatus: "expired" | "expiring_soon";
}

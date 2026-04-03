import { z } from "zod";

export const createItemSchema = z.object({
  itemDescription: z.string().min(1, "Item description is required").max(255),
  categoryId: z.string().uuid("Please select a category"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required").max(50),
  allowsDecimal: z.boolean(),
  tracksExpiration: z.boolean(),
  currentUnitCostPhp: z.coerce
    .number({ error: "Cost must be a number" })
    .positive("Cost must be greater than 0"),
  reorderLevel: z.coerce
    .number({ error: "Reorder level must be a number" })
    .min(0, "Reorder level cannot be negative"),
  orderCode: z.string().max(100).optional().nullable(),
  primaryBusiness: z.enum(["brand_a", "brand_b", "shared"]).optional().nullable(),
  primarySupplier: z.string().max(255).optional().nullable(),
  alternativeSuppliers: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateItemSchema = createItemSchema.extend({
  isActive: z.boolean(),
});

export const updatePriceSchema = z.object({
  currentUnitCostPhp: z.coerce
    .number({ error: "Price must be a number" })
    .positive("Price must be greater than 0"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type UpdatePriceInput = z.infer<typeof updatePriceSchema>;

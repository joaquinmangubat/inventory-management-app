import { z } from "zod";
import { BUSINESS_ENTITIES } from "./transactions";

export const ADJUSTMENT_REASONS = [
  "Damaged",
  "Expired",
  "Miscounted",
  "Spillage",
  "Other",
] as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

export const createAdjustmentSchema = z.object({
  itemId: z.string().uuid({ error: "Invalid item" }),
  businessEntity: z.enum(BUSINESS_ENTITIES, {
    error: "Select a business brand",
  }),
  quantityChange: z.coerce
    .number({ error: "Quantity must be a number" })
    .refine((n) => n !== 0, { message: "Quantity cannot be zero" }),
  adjustmentReason: z.enum(ADJUSTMENT_REASONS, {
    error: "Select a reason",
  }),
  adjustmentNotes: z
    .string()
    .min(1, { message: "Notes are required for adjustments" })
    .max(500),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;

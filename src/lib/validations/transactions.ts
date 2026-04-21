import { z } from "zod";

export const BUSINESS_ENTITIES = [
  "Arcy's Kitchen",
  "Bale Kapampangan",
] as const;

export const TRANSACTION_TYPES = ["add", "consume"] as const;

export const createTransactionSchema = z.object({
  itemId: z.string().uuid({ error: "Invalid item" }),
  businessEntity: z.enum(BUSINESS_ENTITIES, {
    error: "Select a business brand",
  }),
  transactionType: z.enum(TRANSACTION_TYPES, {
    error: "Select a transaction type",
  }),
  quantity: z.coerce
    .number({ error: "Quantity must be a number" })
    .positive({ message: "Quantity must be greater than 0" }),
  expirationDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const editTransactionSchema = z.object({
  businessEntity: z.enum(BUSINESS_ENTITIES, {
    error: "Select a business brand",
  }),
  quantity: z.coerce
    .number({ error: "Quantity must be a number" })
    .positive({ message: "Quantity must be greater than 0" }),
  expirationDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type EditTransactionInput = z.infer<typeof editTransactionSchema>;

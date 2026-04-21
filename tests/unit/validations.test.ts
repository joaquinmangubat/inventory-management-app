import { describe, it, expect } from "vitest";
import { changePasswordSchema, changePinSchema } from "@/lib/validations/auth";
import {
  createTransactionSchema,
} from "@/lib/validations/transactions";
import { createAdjustmentSchema } from "@/lib/validations/adjustments";
import { updateSettingsSchema } from "@/lib/validations/settings";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("changePasswordSchema", () => {
  it("accepts matching passwords that meet length requirement", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "anything",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects new password that is too short", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "anything",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "anything",
      newPassword: "newpassword123",
      confirmPassword: "differentpassword",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePinSchema", () => {
  it("accepts a valid 4-digit PIN", () => {
    const result = changePinSchema.safeParse({
      currentPin: "1234",
      newPin: "5678",
      confirmPin: "5678",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid 6-digit PIN", () => {
    const result = changePinSchema.safeParse({
      currentPin: "123456",
      newPin: "654321",
      confirmPin: "654321",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-numeric PIN", () => {
    const result = changePinSchema.safeParse({
      currentPin: "1234",
      newPin: "abcd",
      confirmPin: "abcd",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a 3-digit PIN (below minimum length)", () => {
    const result = changePinSchema.safeParse({
      currentPin: "123",
      newPin: "123",
      confirmPin: "123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched PINs", () => {
    const result = changePinSchema.safeParse({
      currentPin: "1234",
      newPin: "1234",
      confirmPin: "5678",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTransactionSchema", () => {
  it("accepts a valid add transaction", () => {
    const result = createTransactionSchema.safeParse({
      itemId: VALID_UUID,
      businessEntity: "Arcy's Kitchen",
      transactionType: "add",
      quantity: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid business entity", () => {
    const result = createTransactionSchema.safeParse({
      itemId: VALID_UUID,
      businessEntity: "Unknown Brand",
      transactionType: "add",
      quantity: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = createTransactionSchema.safeParse({
      itemId: VALID_UUID,
      businessEntity: "Arcy's Kitchen",
      transactionType: "add",
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("createAdjustmentSchema", () => {
  it("accepts a valid negative correction", () => {
    const result = createAdjustmentSchema.safeParse({
      itemId: VALID_UUID,
      businessEntity: "Arcy's Kitchen",
      quantityChange: -5,
      adjustmentReason: "Damaged",
      adjustmentNotes: "Found broken items during stock check",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity change", () => {
    const result = createAdjustmentSchema.safeParse({
      itemId: VALID_UUID,
      businessEntity: "Arcy's Kitchen",
      quantityChange: 0,
      adjustmentReason: "Damaged",
      adjustmentNotes: "Some notes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing adjustment reason", () => {
    const result = createAdjustmentSchema.safeParse({
      itemId: VALID_UUID,
      businessEntity: "Arcy's Kitchen",
      quantityChange: -3,
      adjustmentNotes: "Some notes",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSettingsSchema", () => {
  it("accepts valid values within allowed ranges", () => {
    const result = updateSettingsSchema.safeParse({
      edit_window_minutes: 10,
      expiry_alert_days: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects edit_window_minutes below minimum (1)", () => {
    const result = updateSettingsSchema.safeParse({
      edit_window_minutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects edit_window_minutes above maximum (60)", () => {
    const result = updateSettingsSchema.safeParse({
      edit_window_minutes: 61,
    });
    expect(result.success).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateNewStock,
  isWithinEditWindow,
  getExpiryStatus,
  validateQuantityDecimal,
} from "@/lib/business-logic";

describe("calculateNewStock", () => {
  it("subtracts consumed quantity from current stock", () => {
    expect(calculateNewStock(100, -5)).toBe(95);
  });

  it("allows negative stock (business rule)", () => {
    expect(calculateNewStock(5, -10)).toBe(-5);
  });

  it("handles decimal quantity changes", () => {
    expect(calculateNewStock(10, 2.5)).toBe(12.5);
  });
});

describe("isWithinEditWindow", () => {
  it("returns true when timestamp is 2 minutes ago and window is 5 minutes", () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    expect(isWithinEditWindow(twoMinutesAgo, 5)).toBe(true);
  });

  it("returns true when timestamp is exactly at the boundary", () => {
    const exactlyAtBoundary = new Date(Date.now() - 5 * 60 * 1000);
    expect(isWithinEditWindow(exactlyAtBoundary, 5)).toBe(true);
  });

  it("returns false when timestamp is 6 minutes ago and window is 5 minutes", () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
    expect(isWithinEditWindow(sixMinutesAgo, 5)).toBe(false);
  });
});

describe("getExpiryStatus", () => {
  it('returns "ok" when expiration is 10 days out and threshold is 7 days', () => {
    const tenDaysOut = new Date();
    tenDaysOut.setDate(tenDaysOut.getDate() + 10);
    expect(getExpiryStatus(tenDaysOut, 7)).toBe("ok");
  });

  it('returns "expiring_soon" when expiration is 3 days out and threshold is 7 days', () => {
    const threeDaysOut = new Date();
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);
    expect(getExpiryStatus(threeDaysOut, 7)).toBe("expiring_soon");
  });

  it('returns "expired" when expiration was yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getExpiryStatus(yesterday, 7)).toBe("expired");
  });

  it('returns "expired" when expiration is exactly today', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(getExpiryStatus(today, 7)).toBe("expired");
  });
});

describe("validateQuantityDecimal", () => {
  it("returns null when item allows decimals and quantity is decimal", () => {
    expect(validateQuantityDecimal(1.5, true)).toBeNull();
  });

  it("returns an error string when item disallows decimals and quantity is decimal", () => {
    const result = validateQuantityDecimal(1.5, false);
    expect(result).toBeTypeOf("string");
    expect(result).not.toBeNull();
  });

  it("returns null when item disallows decimals but quantity is a whole number", () => {
    expect(validateQuantityDecimal(2, false)).toBeNull();
  });
});

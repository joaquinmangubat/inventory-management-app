/**
 * Pure business logic functions extracted from API route handlers.
 * These have no side effects and are safe to unit test directly.
 */

/** Add a signed quantity change to current stock. */
export function calculateNewStock(
  currentStock: number,
  quantityChange: number
): number {
  return currentStock + quantityChange;
}

/**
 * Return true if the given timestamp is still within the edit window.
 * @param timestamp - When the transaction was originally created
 * @param windowMinutes - Allowed edit window in minutes
 */
export function isWithinEditWindow(
  timestamp: Date,
  windowMinutes: number
): boolean {
  const windowMs = windowMinutes * 60 * 1000;
  const msSince = Date.now() - timestamp.getTime();
  return msSince <= windowMs;
}

/**
 * Classify an item's expiration status relative to today.
 * "expired"       — expiration date is today or in the past
 * "expiring_soon" — expiration date is within alertDays from today
 * "ok"            — expiration date is beyond the alert threshold
 */
export function getExpiryStatus(
  expirationDate: Date,
  alertDays: number
): "ok" | "expiring_soon" | "expired" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDay = new Date(expirationDate);
  expiryDay.setHours(0, 0, 0, 0);

  const alertDate = new Date(today);
  alertDate.setDate(alertDate.getDate() + alertDays);

  if (expiryDay <= today) return "expired";
  if (expiryDay <= alertDate) return "expiring_soon";
  return "ok";
}

/**
 * Validate whether a quantity is allowed given the item's decimal setting.
 * Returns an error message string if invalid, null if valid.
 */
export function validateQuantityDecimal(
  quantity: number,
  allowsDecimal: boolean
): string | null {
  if (!allowsDecimal && !Number.isInteger(quantity)) {
    return "This item does not allow decimal quantities";
  }
  return null;
}

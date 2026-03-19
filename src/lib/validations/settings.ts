import { z } from "zod";

export const updateSettingsSchema = z.object({
  session_timeout_minutes: z.coerce.number().int().min(15).max(480).optional(),
  edit_window_minutes: z.coerce.number().int().min(1).max(60).optional(),
  require_adjustment_notes: z.enum(["true", "false"]).optional(),
  expiry_alert_days: z.coerce.number().int().min(1).max(30).optional(),
  low_stock_threshold_percent: z.coerce.number().int().min(1).max(100).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

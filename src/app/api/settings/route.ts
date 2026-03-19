import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/auth";
import { updateSettingsSchema } from "@/lib/validations/settings";
import type { SystemSettings } from "@/types/settings";

const DEFAULTS: SystemSettings = {
  session_timeout_minutes: 90,
  edit_window_minutes: 5,
  require_adjustment_notes: false,
  expiry_alert_days: 7,
  low_stock_threshold_percent: 20,
};

async function loadSettings(): Promise<SystemSettings> {
  const rows = await db.systemSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    session_timeout_minutes: map.has("session_timeout_minutes")
      ? parseInt(map.get("session_timeout_minutes")!, 10)
      : DEFAULTS.session_timeout_minutes,
    edit_window_minutes: map.has("edit_window_minutes")
      ? parseInt(map.get("edit_window_minutes")!, 10)
      : DEFAULTS.edit_window_minutes,
    require_adjustment_notes: map.has("require_adjustment_notes")
      ? map.get("require_adjustment_notes") === "true"
      : DEFAULTS.require_adjustment_notes,
    expiry_alert_days: map.has("expiry_alert_days")
      ? parseInt(map.get("expiry_alert_days")!, 10)
      : DEFAULTS.expiry_alert_days,
    low_stock_threshold_percent: map.has("low_stock_threshold_percent")
      ? parseInt(map.get("low_stock_threshold_percent")!, 10)
      : DEFAULTS.low_stock_threshold_percent,
  };
}

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await loadSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Upsert each provided key
    const upserts: Promise<unknown>[] = [];

    if (updates.session_timeout_minutes !== undefined) {
      upserts.push(
        db.systemSetting.upsert({
          where: { key: "session_timeout_minutes" },
          create: { key: "session_timeout_minutes", value: String(updates.session_timeout_minutes) },
          update: { value: String(updates.session_timeout_minutes) },
        })
      );
    }
    if (updates.edit_window_minutes !== undefined) {
      upserts.push(
        db.systemSetting.upsert({
          where: { key: "edit_window_minutes" },
          create: { key: "edit_window_minutes", value: String(updates.edit_window_minutes) },
          update: { value: String(updates.edit_window_minutes) },
        })
      );
    }
    if (updates.require_adjustment_notes !== undefined) {
      upserts.push(
        db.systemSetting.upsert({
          where: { key: "require_adjustment_notes" },
          create: { key: "require_adjustment_notes", value: updates.require_adjustment_notes },
          update: { value: updates.require_adjustment_notes },
        })
      );
    }
    if (updates.expiry_alert_days !== undefined) {
      upserts.push(
        db.systemSetting.upsert({
          where: { key: "expiry_alert_days" },
          create: { key: "expiry_alert_days", value: String(updates.expiry_alert_days) },
          update: { value: String(updates.expiry_alert_days) },
        })
      );
    }
    if (updates.low_stock_threshold_percent !== undefined) {
      upserts.push(
        db.systemSetting.upsert({
          where: { key: "low_stock_threshold_percent" },
          create: {
            key: "low_stock_threshold_percent",
            value: String(updates.low_stock_threshold_percent),
          },
          update: { value: String(updates.low_stock_threshold_percent) },
        })
      );
    }

    await Promise.all(upserts);

    const settings = await loadSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSessionFromCookie: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    systemSetting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { getSessionFromCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, PUT } from "@/app/api/settings/route";

const ownerSession = {
  userId: "owner-1",
  role: "owner" as const,
  fullName: "Owner User",
  email: "owner@test.com",
};

const staffSession = {
  userId: "staff-1",
  role: "staff" as const,
  fullName: "Staff User",
  email: "staff@test.com",
};

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown, method = "PUT"): Request {
  return new Request("http://localhost/api/settings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/settings", () => {
  it("returns 200 with defaults when database has no settings rows", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(ownerSession);
    (db.systemSetting.findMany as Mock).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings).toBeDefined();
    expect(json.settings.edit_window_minutes).toBe(5);
    expect(json.settings.session_timeout_minutes).toBe(90);
  });
});

describe("PUT /api/settings", () => {
  it("returns 200 with updated value when owner updates edit_window_minutes", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(ownerSession);
    (db.systemSetting.upsert as Mock).mockResolvedValue({});
    (db.systemSetting.findMany as Mock).mockResolvedValue([
      { key: "edit_window_minutes", value: "10" },
    ]);

    const req = makeRequest({ edit_window_minutes: 10 });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.settings.edit_window_minutes).toBe(10);
  });

  it("returns 403 when a staff member attempts to update settings", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(staffSession);

    const req = makeRequest({ edit_window_minutes: 10 });
    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when edit_window_minutes is outside the allowed range", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(ownerSession);

    // 0 is below min(1)
    const req = makeRequest({ edit_window_minutes: 0 });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});

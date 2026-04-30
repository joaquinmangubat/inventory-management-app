import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSessionFromCookie: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    item: { findUnique: vi.fn(), update: vi.fn() },
    transaction: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
    systemSetting: { findUnique: vi.fn() },
  },
}));

import { getSessionFromCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST } from "@/app/api/transactions/route";
import { PUT } from "@/app/api/transactions/[id]/route";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ITEM_UUID = "660e8400-e29b-41d4-a716-446655440001";

const mockSession = { userId: "user-1", role: "staff" as const, fullName: "Test User", email: "test@test.com" };
const mockItem = {
  id: ITEM_UUID,
  itemDescription: "Test Item",
  unitOfMeasure: "pcs",
  allowsDecimal: false,
  tracksExpiration: false,
  isActive: true,
  currentUnitCostPhp: 10,
  quantityInStock: 100,
};
const mockTransaction = {
  id: "txn-1",
  itemId: ITEM_UUID,
  businessEntity: "Business A",
  transactionType: "consume",
  quantityChange: -5,
  stockAfterTransaction: 95,
  unitCostAtTransaction: 10,
  loggedByUserId: "user-1",
  notes: null,
  expirationDate: null,
  editedAt: null,
  editedByUserId: null,
  originalBusinessEntity: null,
  timestamp: new Date(),
  item: {
    id: ITEM_UUID,
    itemDescription: "Test Item",
    unitOfMeasure: "pcs",
    allowsDecimal: false,
    tracksExpiration: false,
    currentUnitCostPhp: 10,
    quantityInStock: 95,
  },
  loggedBy: { id: "user-1", fullName: "Test User" },
  editedBy: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// Helper to create a mock Request
function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper to create a PUT request
function makePutRequest(body: unknown): Request {
  return new Request(`http://localhost/api/transactions/txn-1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/transactions", () => {
  it("returns 201 with the created transaction on valid consume", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(mockSession);
    (db.item.findUnique as Mock).mockResolvedValue(mockItem);
    (db.$transaction as Mock).mockResolvedValue([mockTransaction, mockItem]);
    (db.user.findMany as Mock).mockResolvedValue([]);

    const req = makeRequest({
      itemId: ITEM_UUID,
      businessEntity: "Business A",
      transactionType: "consume",
      quantity: 5,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.transaction).toBeDefined();
  });

  it("returns 400 when decimal quantity is used on a non-decimal item", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(mockSession);
    (db.item.findUnique as Mock).mockResolvedValue({ ...mockItem, allowsDecimal: false });

    const req = makeRequest({
      itemId: ITEM_UUID,
      businessEntity: "Business A",
      transactionType: "consume",
      quantity: 1.5,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/decimal/i);
  });

  it("returns 400 when expiration date is missing on a tracked add transaction", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(mockSession);
    (db.item.findUnique as Mock).mockResolvedValue({
      ...mockItem,
      tracksExpiration: true,
    });

    const req = makeRequest({
      itemId: ITEM_UUID,
      businessEntity: "Business A",
      transactionType: "add",
      quantity: 5,
      // expirationDate intentionally omitted
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/expiration/i);
  });

  it("returns 401 when not authenticated", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(null);

    const req = makeRequest({
      itemId: ITEM_UUID,
      businessEntity: "Business A",
      transactionType: "consume",
      quantity: 5,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/transactions/[id]", () => {
  const mockParams = Promise.resolve({ id: "txn-1" });

  it("returns 200 when editing within the edit window", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(mockSession);
    (db.transaction.findUnique as Mock).mockResolvedValue({
      ...mockTransaction,
      transactionType: "consume",
      timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    });
    (db.systemSetting.findUnique as Mock).mockResolvedValue(null); // default 5 min window
    (db.$transaction as Mock).mockResolvedValue([
      { ...mockTransaction, quantityChange: -10, stockAfterTransaction: 90 },
      mockItem,
    ]);

    const req = makePutRequest({
      businessEntity: "Business A",
      quantity: 10,
    });

    const res = await PUT(req, { params: mockParams });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.transaction).toBeDefined();
  });

  it("returns 403 when the edit window has expired", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(mockSession);
    (db.transaction.findUnique as Mock).mockResolvedValue({
      ...mockTransaction,
      timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    });
    (db.systemSetting.findUnique as Mock).mockResolvedValue(null); // default 5 min window

    const req = makePutRequest({
      businessEntity: "Business A",
      quantity: 10,
    });

    const res = await PUT(req, { params: mockParams });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/edit window/i);
  });

  it("returns 403 when the requester is not the original logger", async () => {
    (getSessionFromCookie as Mock).mockResolvedValue(mockSession); // user-1
    (db.transaction.findUnique as Mock).mockResolvedValue({
      ...mockTransaction,
      loggedByUserId: "user-2", // different user
    });

    const req = makePutRequest({
      businessEntity: "Business A",
      quantity: 10,
    });

    const res = await PUT(req, { params: mockParams });
    expect(res.status).toBe(403);
  });
});

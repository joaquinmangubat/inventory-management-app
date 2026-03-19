import { vi } from "vitest";

// Stub next/headers so server-only imports don't throw in the Node test environment
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

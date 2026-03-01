import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/knowledge", () => ({
  listKnowledgeObjectsPaginated: vi.fn(),
}));

import { GET } from "@/app/api/v1/knowledge/route";
import { validateApiKey } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { listKnowledgeObjectsPaginated } from "@/lib/knowledge";
import { NextRequest } from "next/server";

const mockedValidateApiKey = vi.mocked(validateApiKey);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedList = vi.mocked(listKnowledgeObjectsPaginated);

const mockSystem = {
  id: "sys-1",
  name: "Test System",
  description: "Test",
  apiKeyPrefix: "test1234",
  permissions: ["read"],
  subscribedTypes: ["*"],
  rateLimitTier: "standard",
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedValidateApiKey.mockResolvedValue(mockSystem);
  mockedCheckRateLimit.mockResolvedValue({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  });
});

describe("GET /api/v1/knowledge", () => {
  it("returns 401 without X-API-Key header", async () => {
    const res = await GET(makeRequest("/api/v1/knowledge"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Missing");
  });

  it("returns 401 with invalid key", async () => {
    mockedValidateApiKey.mockResolvedValue(null);
    const res = await GET(makeRequest("/api/v1/knowledge", { "X-API-Key": "bad" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Invalid");
  });

  it("returns 200 with valid key and data + meta", async () => {
    const items = [{ id: "k1", name: "Persona A", type: "persona", tags: [], deprecated: false, createdAt: "", updatedAt: "" }];
    mockedList.mockResolvedValue({ items, total: 1 });

    const res = await GET(makeRequest("/api/v1/knowledge", { "X-API-Key": "valid-key" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(items);
    expect(json.meta).toMatchObject({ total: 1, limit: 100, offset: 0 });
  });

  it("passes type filter to listKnowledgeObjectsPaginated", async () => {
    mockedList.mockResolvedValue({ items: [], total: 0 });

    await GET(makeRequest("/api/v1/knowledge?type=persona", { "X-API-Key": "key" }));
    expect(mockedList).toHaveBeenCalledWith(
      expect.objectContaining({ type: "persona" })
    );
  });

  it("returns 400 for invalid type", async () => {
    const res = await GET(makeRequest("/api/v1/knowledge?type=invalid_type", { "X-API-Key": "key" }));
    expect(res.status).toBe(400);
  });

  it("includes rate limit headers in response", async () => {
    mockedList.mockResolvedValue({ items: [], total: 0 });

    const res = await GET(makeRequest("/api/v1/knowledge", { "X-API-Key": "key" }));
    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
  });
});

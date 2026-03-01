import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/knowledge", () => ({
  getKnowledgeObject: vi.fn(),
}));

import { GET } from "@/app/api/v1/knowledge/[id]/route";
import { validateApiKey } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getKnowledgeObject } from "@/lib/knowledge";
import { NextRequest } from "next/server";

const mockedValidateApiKey = vi.mocked(validateApiKey);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedGet = vi.mocked(getKnowledgeObject);

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

describe("GET /api/v1/knowledge/[id]", () => {
  it("returns 200 with knowledge object data", async () => {
    const obj = {
      id: "k-1",
      name: "Test Persona",
      type: "persona",
      content: "Hello world",
      tags: ["tag1"],
      deprecated: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      crossReferences: {},
    };
    mockedGet.mockResolvedValue(obj as never);

    const res = await GET(makeRequest("/api/v1/knowledge/k-1", { "X-API-Key": "key" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toMatchObject({ id: "k-1", name: "Test Persona" });
  });

  it("returns 404 when not found", async () => {
    mockedGet.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/v1/knowledge/nonexistent", { "X-API-Key": "key" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("not found");
  });

  it("returns 401 without X-API-Key", async () => {
    const res = await GET(makeRequest("/api/v1/knowledge/k-1"));
    expect(res.status).toBe(401);
  });
});

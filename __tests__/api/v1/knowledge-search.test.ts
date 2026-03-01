import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/knowledge", () => ({
  semanticSearchKnowledge: vi.fn(),
}));

import { GET } from "@/app/api/v1/knowledge/search/route";
import { validateApiKey } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { semanticSearchKnowledge } from "@/lib/knowledge";
import { NextRequest } from "next/server";

const mockedValidateApiKey = vi.mocked(validateApiKey);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedSearch = vi.mocked(semanticSearchKnowledge);

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

describe("GET /api/v1/knowledge/search", () => {
  it("returns 400 when q param is missing", async () => {
    const res = await GET(makeRequest("/api/v1/knowledge/search", { "X-API-Key": "key" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("q");
  });

  it("returns 200 with search results", async () => {
    const results = [
      { id: "k1", name: "Persona A", type: "persona", tags: [], score: 0.95, snippet: "text" },
    ];
    mockedSearch.mockResolvedValue(results as never);

    const res = await GET(
      makeRequest("/api/v1/knowledge/search?q=marketing", { "X-API-Key": "key" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(results);
  });

  it("passes type, limit, certainty params to search", async () => {
    mockedSearch.mockResolvedValue([]);

    await GET(
      makeRequest("/api/v1/knowledge/search?q=test&type=persona&limit=5&certainty=0.8", {
        "X-API-Key": "key",
      })
    );

    expect(mockedSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "test",
        type: "persona",
        limit: 5,
        certainty: 0.8,
      })
    );
  });

  it("returns 400 for invalid type", async () => {
    const res = await GET(
      makeRequest("/api/v1/knowledge/search?q=test&type=bogus", { "X-API-Key": "key" })
    );
    expect(res.status).toBe(400);
  });
});

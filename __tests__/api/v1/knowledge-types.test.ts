import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/dashboard", () => ({
  getDashboardData: vi.fn(),
}));

import { GET } from "@/app/api/v1/knowledge/types/route";
import { validateApiKey } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDashboardData } from "@/lib/dashboard";
import { NextRequest } from "next/server";

const mockedValidateApiKey = vi.mocked(validateApiKey);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedGetDashboard = vi.mocked(getDashboardData);

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

describe("GET /api/v1/knowledge/types", () => {
  it("returns 200 with type data array", async () => {
    mockedGetDashboard.mockResolvedValue({
      counts: {
        persona: 5,
        segment: 3,
        use_case: 2,
        business_rule: 1,
        icp: 4,
        competitor: 0,
        customer_evidence: 0,
      },
      totalCount: 15,
      neverReviewed: [],
      stale: [],
      gaps: {
        noRelationships: [],
        partialRelationships: [],
        asymmetricRelationships: [],
        icpMissingRefs: [],
        businessRulesNoSubType: [],
      },
      pendingSubmissionCount: 0,
    } as never);

    const req = new NextRequest("http://localhost:3000/api/v1/knowledge/types", {
      headers: { "X-API-Key": "key" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeInstanceOf(Array);
    expect(json.data.length).toBe(7);

    const persona = json.data.find((t: { type: string }) => t.type === "persona");
    expect(persona).toMatchObject({
      type: "persona",
      displayName: "Persona",
      count: 5,
    });
    expect(persona.description).toBeTruthy();
  });
});

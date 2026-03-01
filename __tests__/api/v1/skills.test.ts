import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/skills", () => ({
  listSkills: vi.fn(),
}));

import { GET } from "@/app/api/v1/skills/route";
import { validateApiKey } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { listSkills } from "@/lib/skills";
import { NextRequest } from "next/server";

const mockedValidateApiKey = vi.mocked(validateApiKey);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedListSkills = vi.mocked(listSkills);

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

describe("GET /api/v1/skills", () => {
  it("returns 200 with skills data", async () => {
    const skills = [
      { id: "s1", name: "Blog Post", contentType: "blog_post", category: "writing", active: true, createdAt: "", updatedAt: "" },
    ];
    mockedListSkills.mockResolvedValue(skills as never);

    const res = await GET(makeRequest("/api/v1/skills", { "X-API-Key": "key" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual(skills);
    expect(json.meta.total).toBe(1);
  });

  it("passes content_type, active, category filters", async () => {
    mockedListSkills.mockResolvedValue([]);

    await GET(
      makeRequest("/api/v1/skills?content_type=blog_post&active=true&category=writing", {
        "X-API-Key": "key",
      })
    );

    expect(mockedListSkills).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "blog_post",
        active: true,
        category: "writing",
      })
    );
  });
});

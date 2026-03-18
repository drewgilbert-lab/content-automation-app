import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-middleware", () => ({
  withApiAuth: (handler: (req: unknown, ctx: unknown) => Promise<Response>) => handler,
}));

vi.mock("@/lib/skills", () => ({
  getSkill: vi.fn(),
}));

import { GET } from "@/app/api/v1/skills/[id]/route";
import { getSkill } from "@/lib/skills";
import { NextRequest } from "next/server";

const mockedGetSkill = vi.mocked(getSkill);

function makeRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/skills/[id]", () => {
  it("returns 200 with skill detail", async () => {
    const skill = {
      id: "s-1",
      name: "Blog Post Skill",
      contentType: "blog",
      content: "Write a blog post...",
      category: "writing",
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    mockedGetSkill.mockResolvedValue(skill as never);

    const res = await GET(makeRequest("/api/v1/skills/s-1", { "X-API-Key": "key" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toMatchObject({ id: "s-1", name: "Blog Post Skill" });
  });

  it("returns 404 when not found", async () => {
    mockedGetSkill.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/v1/skills/nonexistent", { "X-API-Key": "key" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("not found");
  });
});

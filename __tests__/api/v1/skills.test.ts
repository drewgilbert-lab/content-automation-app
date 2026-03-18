import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api-middleware", () => ({
  withApiAuth: (handler: (req: unknown) => Promise<Response>) => handler,
}));

vi.mock("@/lib/skills", () => ({
  listSkills: vi.fn(),
  CONTENT_TYPES: ["email", "blog", "social", "thought_leadership", "internal_doc"],
  isValidContentType: (type: string) =>
    ["email", "blog", "social", "thought_leadership", "internal_doc"].includes(type),
}));

import { GET } from "@/app/api/v1/skills/route";
import { listSkills } from "@/lib/skills";
import { NextRequest } from "next/server";

const mockedListSkills = vi.mocked(listSkills);

function makeRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/skills", () => {
  it("returns 200 with skills data", async () => {
    const skills = [
      { id: "s1", name: "Blog Post", contentType: "blog", category: "writing", active: true, createdAt: "", updatedAt: "" },
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
      makeRequest("/api/v1/skills?content_type=blog&active=true&category=writing", {
        "X-API-Key": "key",
      })
    );

    expect(mockedListSkills).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "blog",
        active: true,
        category: "writing",
      })
    );
  });

  it("returns 400 for invalid content_type", async () => {
    const res = await GET(
      makeRequest("/api/v1/skills?content_type=not_real", {
        "X-API-Key": "key",
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid content_type");
    expect(mockedListSkills).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/skills", () => ({
  listSkills: vi.fn(),
  createSkill: vi.fn(),
  SkillNameConflictError: class SkillNameConflictError extends Error {},
  CONTENT_TYPES: [
    "email",
    "blog",
    "social",
    "thought_leadership",
    "internal_doc",
    "content_narrative",
    "pillar_research",
    "competitor_functionality_brief",
    "competitor_persona_messaging_brief",
    "market_content_brief",
  ],
  isValidContentType: (type: string) =>
    [
      "email",
      "blog",
      "social",
      "thought_leadership",
      "internal_doc",
      "content_narrative",
      "pillar_research",
      "competitor_functionality_brief",
      "competitor_persona_messaging_brief",
      "market_content_brief",
    ].includes(type),
}));

import { GET, POST } from "@/app/api/skills/route";
import { createSkill, listSkills } from "@/lib/skills";

const mockedListSkills = vi.mocked(listSkills);
const mockedCreateSkill = vi.mocked(createSkill);

describe("skills route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid GET contentType filter", async () => {
    const req = new NextRequest("http://localhost:3000/api/skills?contentType=bad_type");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid contentType");
    expect(mockedListSkills).not.toHaveBeenCalled();
  });

  it("rejects POST with invalid contentType values", async () => {
    const req = new NextRequest("http://localhost:3000/api/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "Skill A",
        description: "desc",
        content: "content",
        contentType: ["email", "not_valid"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid contentType value(s)");
    expect(mockedCreateSkill).not.toHaveBeenCalled();
  });

  it("accepts POST with promoted workflow contentType values", async () => {
    mockedCreateSkill.mockResolvedValue("skill-1");
    const req = new NextRequest("http://localhost:3000/api/skills", {
      method: "POST",
      body: JSON.stringify({
        name: "Pillar Research Skill",
        description: "desc",
        content: "content",
        contentType: ["pillar_research", "market_content_brief"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockedCreateSkill).toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/skills", () => ({
  getSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
  checkSkillReferences: vi.fn(),
  activateSkill: vi.fn(),
  deactivateSkill: vi.fn(),
  deprecateSkill: vi.fn(),
  restoreSkill: vi.fn(),
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

import { PUT } from "@/app/api/skills/[id]/route";
import { updateSkill } from "@/lib/skills";

const mockedUpdateSkill = vi.mocked(updateSkill);

describe("skills id route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects PUT with non-array contentType", async () => {
    const req = new NextRequest("http://localhost:3000/api/skills/s1", {
      method: "PUT",
      body: JSON.stringify({ contentType: "blog" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("contentType must be an array");
    expect(mockedUpdateSkill).not.toHaveBeenCalled();
  });

  it("rejects PUT with invalid contentType value", async () => {
    const req = new NextRequest("http://localhost:3000/api/skills/s1", {
      method: "PUT",
      body: JSON.stringify({ contentType: ["email", "wrong"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "s1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid contentType value(s)");
    expect(mockedUpdateSkill).not.toHaveBeenCalled();
  });
});

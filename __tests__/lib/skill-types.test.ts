import { describe, expect, it } from "vitest";
import {
  CONTENT_TYPES,
  getContentTypeLabel,
  isValidContentType,
} from "@/lib/skill-types";

describe("skill content type taxonomy", () => {
  it("includes promoted workflow content types", () => {
    expect(CONTENT_TYPES).toEqual(
      expect.arrayContaining([
        "content_narrative",
        "pillar_research",
        "competitor_functionality_brief",
        "competitor_persona_messaging_brief",
        "market_content_brief",
      ])
    );
  });

  it("returns stable labels for promoted workflow types", () => {
    expect(getContentTypeLabel("pillar_research")).toBe("Pillar Research");
    expect(getContentTypeLabel("content_narrative")).toBe("Content Narrative");
    expect(getContentTypeLabel("market_content_brief")).toBe(
      "Market Content Brief"
    );
  });

  it("validates known and unknown content types", () => {
    expect(isValidContentType("email")).toBe(true);
    expect(isValidContentType("pillar_research")).toBe(true);
    expect(isValidContentType("definitely_invalid")).toBe(false);
  });
});

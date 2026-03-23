import { describe, expect, it } from "vitest";
import { buildSkillRefreshPrompt } from "@/lib/merge";

describe("buildSkillRefreshPrompt", () => {
  it("returns systemPrompt and userMessage", () => {
    const result = buildSkillRefreshPrompt("skill content", "object content", "update job titles");
    expect(result.systemPrompt).toBeDefined();
    expect(result.userMessage).toBeDefined();
  });

  it("includes skill content in user message", () => {
    const result = buildSkillRefreshPrompt("my skill instructions", "object content", "prompt");
    expect(result.userMessage).toContain("my skill instructions");
  });

  it("includes updated object content in user message", () => {
    const result = buildSkillRefreshPrompt("skill", "updated knowledge object body", "prompt");
    expect(result.userMessage).toContain("updated knowledge object body");
  });

  it("includes integration prompt in user message", () => {
    const result = buildSkillRefreshPrompt("skill", "object", "Update references to pain points");
    expect(result.userMessage).toContain("Update references to pain points");
  });

  it("system prompt preserves procedural structure", () => {
    const result = buildSkillRefreshPrompt("skill", "object", "prompt");
    expect(result.systemPrompt).toContain("procedural structure");
  });

  it("system prompt mentions no commentary", () => {
    const result = buildSkillRefreshPrompt("skill", "object", "prompt");
    expect(result.systemPrompt).toContain("no commentary");
  });
});

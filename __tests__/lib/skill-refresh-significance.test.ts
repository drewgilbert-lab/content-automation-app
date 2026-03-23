import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicClientMock {
    messages = { create: mockCreate };
  },
}));

vi.mock("@/lib/weaviate", () => ({
  withWeaviate: vi.fn(),
}));

vi.mock("weaviate-client", () => ({
  default: {
    filter: {
      byProperty: () => ({ equal: () => ({}) }),
      byRef: () => ({ byId: () => ({ equal: () => ({}) }) }),
    },
    connectToWeaviateCloud: vi.fn(),
  },
}));

import { evaluateSkillRefreshSignificance } from "@/lib/skills";

describe("evaluateSkillRefreshSignificance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns significant: true when Claude says so", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"significant": true, "reason": "Job titles changed"}' }],
    });

    const result = await evaluateSkillRefreshSignificance("old", "new", "skill", "check titles");
    expect(result.significant).toBe(true);
    expect(result.reason).toBe("Job titles changed");
  });

  it("returns significant: false when Claude says not significant", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"significant": false, "reason": "Minor formatting change"}' }],
    });

    const result = await evaluateSkillRefreshSignificance("old", "new", "skill", "check titles");
    expect(result.significant).toBe(false);
    expect(result.reason).toBe("Minor formatting change");
  });

  it("handles JSON wrapped in code fences", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '```json\n{"significant": true, "reason": "Fenced"}\n```' }],
    });

    const result = await evaluateSkillRefreshSignificance("old", "new", "skill", "prompt");
    expect(result.significant).toBe(true);
  });

  it("returns failed result on API error", async () => {
    mockCreate.mockRejectedValue(new Error("API timeout"));

    const result = await evaluateSkillRefreshSignificance("old", "new", "skill", "prompt");
    expect(result.significant).toBe(false);
    expect(result.reason).toContain("Evaluation failed");
  });

  it("returns failed result when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await evaluateSkillRefreshSignificance("old", "new", "skill", "prompt");
    expect(result.significant).toBe(false);
    expect(result.reason).toContain("Missing ANTHROPIC_API_KEY");
  });

  it("returns failed result on invalid JSON response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
    });

    const result = await evaluateSkillRefreshSignificance("old", "new", "skill", "prompt");
    expect(result.significant).toBe(false);
    expect(result.reason).toContain("Evaluation failed");
  });
});

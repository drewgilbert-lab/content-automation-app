import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/weaviate.ts", () => ({
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

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/submissions.ts", () => ({
  createSubmission: vi.fn().mockResolvedValue({ id: "sub-1", status: "pending" }),
  listSubmissions: vi.fn().mockResolvedValue([]),
}));

import { withWeaviate } from "@/lib/weaviate.ts";
import * as skills from "@/lib/skills.ts";
import { createSubmission } from "@/lib/submissions.ts";

const mockedWithWeaviate = vi.mocked(withWeaviate);
const mockedCreateSubmission = vi.mocked(createSubmission);

describe("triggerSkillRefreshCheck", () => {
  let evalSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    evalSpy = vi
      .spyOn(skills, "evaluateSkillRefreshSignificance")
      .mockResolvedValue({ significant: true, reason: "Content changed significantly" });
  });

  afterAll(() => {
    evalSpy.mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
    evalSpy.mockResolvedValue({ significant: true, reason: "Content changed significantly" });
    mockedCreateSubmission.mockResolvedValue({ id: "sub-1", status: "pending" });
  });

  it("does not throw on error (fire-and-forget)", async () => {
    mockedWithWeaviate.mockRejectedValue(new Error("DB down"));

    await expect(
      skills.triggerSkillRefreshCheck("obj-1", "Object Name", "old", "new")
    ).resolves.toBeUndefined();
  });

  it("does nothing when no skills have the object linked", async () => {
    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockClient = {
        collections: {
          use: () => ({
            query: {
              fetchObjects: async () => ({ objects: [] }),
              fetchObjectById: async () => null,
            },
          }),
        },
      };
      return fn(mockClient as never);
    });

    await skills.triggerSkillRefreshCheck("obj-1", "Object Name", "old", "new");
    expect(mockedCreateSubmission).not.toHaveBeenCalled();
  });
});

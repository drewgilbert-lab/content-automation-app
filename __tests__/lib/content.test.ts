import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/weaviate", () => ({
  withWeaviate: vi.fn(),
}));

vi.mock("@/lib/skill-types", () => ({
  isValidContentType: vi.fn((type: string) => {
    const valid = [
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
    ];
    return valid.includes(type);
  }),
}));

import {
  listContent,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  semanticSearchContent,
  submitForReview,
  approveContent,
  rejectContent,
  publishContent,
  resetToDraft,
  countContentByKnowledgeObject,
  ContentStatusError,
} from "@/lib/content";
import { withWeaviate } from "@/lib/weaviate";

const mockedWithWeaviate = vi.mocked(withWeaviate);

function makeContentObj(id: string, overrides: Record<string, unknown> = {}) {
  return {
    uuid: id,
    properties: {
      title: `Content ${id}`,
      contentType: "email",
      body: "Test body content",
      status: "draft",
      tags: [],
      createdBy: "user@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      ...overrides,
    },
    references: undefined as Record<string, unknown> | undefined,
  };
}

function setupClient(mockCollection: Record<string, unknown>) {
  mockedWithWeaviate.mockImplementation(async (fn) => {
    const client = { collections: { use: () => mockCollection } };
    return fn(client as never);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listContent", () => {
  it("returns mapped items sorted by createdAt desc", async () => {
    const older = makeContentObj("older", {
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = makeContentObj("newer", {
      createdAt: "2026-01-03T00:00:00.000Z",
    });
    setupClient({
      query: {
        fetchObjects: vi.fn().mockResolvedValue({ objects: [older, newer] }),
      },
    });

    const items = await listContent();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("newer");
    expect(items[1].id).toBe("older");
  });

  it("filters by status", async () => {
    const draft = makeContentObj("d1", { status: "draft" });
    const approved = makeContentObj("a1", { status: "approved" });
    setupClient({
      query: {
        fetchObjects: vi.fn().mockResolvedValue({ objects: [draft, approved] }),
      },
    });

    const items = await listContent({ status: "draft" });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("d1");
    expect(items[0].status).toBe("draft");
  });

  it("filters by contentType", async () => {
    const email = makeContentObj("e1", { contentType: "email" });
    const blog = makeContentObj("b1", { contentType: "blog" });
    setupClient({
      query: {
        fetchObjects: vi.fn().mockResolvedValue({ objects: [email, blog] }),
      },
    });

    const items = await listContent({ contentType: "blog" });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("b1");
  });

  it("applies pagination (limit/offset)", async () => {
    const a = makeContentObj("a", { createdAt: "2026-01-01T00:00:00.000Z" });
    const b = makeContentObj("b", { createdAt: "2026-01-02T00:00:00.000Z" });
    const c = makeContentObj("c", { createdAt: "2026-01-03T00:00:00.000Z" });
    setupClient({
      query: {
        fetchObjects: vi.fn().mockResolvedValue({ objects: [a, b, c] }),
      },
    });

    const page = await listContent({ limit: 1, offset: 1 });
    expect(page).toHaveLength(1);
    expect(page[0].id).toBe("b");
  });
});

describe("getContent", () => {
  it("returns null when not found", async () => {
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(null) },
    });

    const result = await getContent("missing-id");
    expect(result).toBeNull();
  });

  it("returns detail with resolved cross-references", async () => {
    const objWithRefs = makeContentObj("ref-id");
    objWithRefs.references = {
      usedPersona: {
        objects: [{ uuid: "p1", properties: { name: "Enterprise Buyer" } }],
      },
      usedSegment: {
        objects: [{ uuid: "s1", properties: { name: "Mid-Market" } }],
      },
      usedUseCases: { objects: [] },
      usedBusinessRules: { objects: [] },
      usedSkills: {
        objects: [{ uuid: "sk1", properties: { name: "Email Skill" } }],
      },
    };

    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(objWithRefs) },
    });

    const detail = await getContent("ref-id");
    expect(detail).not.toBeNull();
    expect(detail!.usedPersona).toEqual({
      id: "p1",
      name: "Enterprise Buyer",
    });
    expect(detail!.usedSegment).toEqual({ id: "s1", name: "Mid-Market" });
    expect(detail!.usedUseCases).toEqual([]);
    expect(detail!.usedBusinessRules).toEqual([]);
    expect(detail!.usedSkills).toEqual([{ id: "sk1", name: "Email Skill" }]);
  });
});

describe("createContent", () => {
  it("creates with valid contentType and returns ID", async () => {
    const insertMock = vi.fn().mockResolvedValue("new-content-id");
    setupClient({
      data: { insert: insertMock, referenceAdd: vi.fn() },
    });

    const id = await createContent({
      title: "Hello",
      contentType: "email",
      body: "Body",
      createdBy: "author@example.com",
    });

    expect(id).toBe("new-content-id");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Hello",
        contentType: "email",
        body: "Body",
        status: "draft",
        createdBy: "author@example.com",
      }),
    );
  });

  it("throws on invalid contentType", async () => {
    setupClient({ data: { insert: vi.fn() } });

    await expect(
      createContent({
        title: "T",
        contentType: "invalid_type",
        body: "B",
        createdBy: "u@example.com",
      }),
    ).rejects.toThrow(/Invalid content type/i);
  });

  it("adds cross-references when IDs are provided", async () => {
    const insertMock = vi.fn().mockResolvedValue("cid");
    const referenceAdd = vi.fn().mockResolvedValue(undefined);
    setupClient({
      data: { insert: insertMock, referenceAdd },
    });

    await createContent({
      title: "T",
      contentType: "email",
      body: "B",
      createdBy: "u@example.com",
      personaId: "persona-1",
      segmentId: "seg-1",
      useCaseIds: ["uc-1"],
      businessRuleIds: ["br-1"],
      skillIds: ["sk-1"],
    });

    expect(referenceAdd).toHaveBeenCalledWith({
      fromUuid: "cid",
      fromProperty: "usedPersona",
      to: "persona-1",
    });
    expect(referenceAdd).toHaveBeenCalledWith({
      fromUuid: "cid",
      fromProperty: "usedSegment",
      to: "seg-1",
    });
    expect(referenceAdd).toHaveBeenCalledWith({
      fromUuid: "cid",
      fromProperty: "usedUseCases",
      to: "uc-1",
    });
    expect(referenceAdd).toHaveBeenCalledWith({
      fromUuid: "cid",
      fromProperty: "usedBusinessRules",
      to: "br-1",
    });
    expect(referenceAdd).toHaveBeenCalledWith({
      fromUuid: "cid",
      fromProperty: "usedSkills",
      to: "sk-1",
    });
  });
});

describe("updateContent", () => {
  it("updates draft content successfully", async () => {
    const draft = makeContentObj("u1", { status: "draft" });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(draft) },
      data: { update: updateMock },
    });

    const result = await updateContent("u1", {
      title: "Updated",
      updatedBy: "editor@example.com",
    });

    expect(result).toBeNull();
    expect(updateMock).toHaveBeenCalledWith({
      id: "u1",
      properties: expect.objectContaining({
        title: "Updated",
        updatedBy: "editor@example.com",
      }),
    });
  });

  it("throws ContentStatusError when status is submitted", async () => {
    setupClient({
      query: {
        fetchObjectById: vi
          .fn()
          .mockResolvedValue(makeContentObj("s1", { status: "submitted" })),
      },
    });

    await expect(
      updateContent("s1", { updatedBy: "u@example.com" }),
    ).rejects.toThrow(ContentStatusError);
  });

  it("throws ContentStatusError when status is approved", async () => {
    setupClient({
      query: {
        fetchObjectById: vi
          .fn()
          .mockResolvedValue(makeContentObj("a1", { status: "approved" })),
      },
    });

    await expect(
      updateContent("a1", { updatedBy: "u@example.com" }),
    ).rejects.toThrow(ContentStatusError);
  });

  it("returns null when not found", async () => {
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(null) },
    });

    const result = await updateContent("missing", {
      updatedBy: "u@example.com",
    });
    expect(result).toBeNull();
  });
});

describe("deleteContent", () => {
  it("deletes draft content", async () => {
    const draft = makeContentObj("d1", { status: "draft" });
    const deleteById = vi.fn().mockResolvedValue(undefined);
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(draft) },
      data: { deleteById },
    });

    const ok = await deleteContent("d1");
    expect(ok).toBe(true);
    expect(deleteById).toHaveBeenCalledWith("d1");
  });

  it("throws ContentStatusError when status is published", async () => {
    setupClient({
      query: {
        fetchObjectById: vi
          .fn()
          .mockResolvedValue(makeContentObj("p1", { status: "published" })),
      },
    });

    await expect(deleteContent("p1")).rejects.toThrow(ContentStatusError);
  });

  it("returns false when not found", async () => {
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(null) },
    });

    const ok = await deleteContent("missing");
    expect(ok).toBe(false);
  });
});

describe("submitForReview", () => {
  it("succeeds from draft status", async () => {
    const draft = makeContentObj("sr1", { status: "draft" });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(draft) },
      data: { update: updateMock },
    });

    await submitForReview("sr1", "submitter@example.com");

    expect(updateMock).toHaveBeenCalledWith({
      id: "sr1",
      properties: expect.objectContaining({
        status: "submitted",
        updatedBy: "submitter@example.com",
      }),
    });
  });

  it("throws ContentStatusError from non-draft status", async () => {
    setupClient({
      query: {
        fetchObjectById: vi
          .fn()
          .mockResolvedValue(makeContentObj("x1", { status: "approved" })),
      },
    });

    await expect(
      submitForReview("x1", "u@example.com"),
    ).rejects.toThrow(ContentStatusError);
  });
});

describe("rejectContent", () => {
  it("throws when comment is empty string", async () => {
    await expect(
      rejectContent("r1", "rev@example.com", ""),
    ).rejects.toThrow(/comment is required/i);
  });

  it("throws ContentStatusError when status is not in_review", async () => {
    setupClient({
      query: {
        fetchObjectById: vi
          .fn()
          .mockResolvedValue(makeContentObj("d1", { status: "draft" })),
      },
    });

    await expect(
      rejectContent("d1", "rev@example.com", "needs work"),
    ).rejects.toThrow(ContentStatusError);
  });

  it("succeeds with valid comment from in_review status", async () => {
    const inReview = makeContentObj("ir1", { status: "in_review" });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(inReview) },
      data: { update: updateMock },
    });

    await rejectContent("ir1", "rev@example.com", "  fix tone  ");

    expect(updateMock).toHaveBeenCalledWith({
      id: "ir1",
      properties: expect.objectContaining({
        status: "draft",
        reviewComment: "fix tone",
      }),
    });
  });
});

describe("approveContent", () => {
  it("succeeds from in_review status", async () => {
    const inReview = makeContentObj("ap1", { status: "in_review" });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(inReview) },
      data: { update: updateMock },
    });

    await approveContent("ap1", "rev@example.com", "LGTM");

    expect(updateMock).toHaveBeenCalledWith({
      id: "ap1",
      properties: expect.objectContaining({
        status: "approved",
        reviewComment: "LGTM",
      }),
    });
  });

  it("throws ContentStatusError from draft status", async () => {
    setupClient({
      query: {
        fetchObjectById: vi
          .fn()
          .mockResolvedValue(makeContentObj("dr1", { status: "draft" })),
      },
    });

    await expect(
      approveContent("dr1", "rev@example.com"),
    ).rejects.toThrow(ContentStatusError);
  });
});

describe("publishContent", () => {
  it("succeeds from approved status", async () => {
    const approved = makeContentObj("pub1", { status: "approved" });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(approved) },
      data: { update: updateMock },
    });

    await publishContent("pub1", "publisher@example.com");

    expect(updateMock).toHaveBeenCalledWith({
      id: "pub1",
      properties: expect.objectContaining({
        status: "published",
        updatedBy: "publisher@example.com",
      }),
    });
  });

  it("throws ContentStatusError from draft status", async () => {
    setupClient({
      query: {
        fetchObjectById: vi
          .fn()
          .mockResolvedValue(makeContentObj("dr2", { status: "draft" })),
      },
    });

    await expect(
      publishContent("dr2", "u@example.com"),
    ).rejects.toThrow(ContentStatusError);
  });
});

describe("resetToDraft", () => {
  it("succeeds from approved status", async () => {
    const approved = makeContentObj("rs1", { status: "approved" });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(approved) },
      data: { update: updateMock },
    });

    await resetToDraft("rs1", "admin@example.com");

    expect(updateMock).toHaveBeenCalledWith({
      id: "rs1",
      properties: expect.objectContaining({
        status: "draft",
        reviewComment: "",
      }),
    });
  });

  it("succeeds from published status", async () => {
    const published = makeContentObj("rs2", { status: "published" });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(published) },
      data: { update: updateMock },
    });

    await resetToDraft("rs2", "admin@example.com");

    expect(updateMock).toHaveBeenCalledWith({
      id: "rs2",
      properties: expect.objectContaining({ status: "draft" }),
    });
  });

  it("throws ContentStatusError from draft status", async () => {
    setupClient({
      query: {
        fetchObjectById: vi
          .fn()
          .mockResolvedValue(makeContentObj("dr3", { status: "draft" })),
      },
    });

    await expect(resetToDraft("dr3", "u@example.com")).rejects.toThrow(
      ContentStatusError,
    );
  });
});

describe("semanticSearchContent", () => {
  it("returns results with snippets (body truncated to 500 chars)", async () => {
    const longBody = "A".repeat(600);
    const nearText = vi.fn().mockResolvedValue({
      objects: [
        {
          uuid: "s1",
          properties: {
            title: "Result",
            contentType: "email",
            status: "draft",
            body: longBody,
          },
          metadata: { certainty: 0.85 },
        },
      ],
    });
    setupClient({
      query: { nearText },
    });

    const results = await semanticSearchContent("marketing copy");

    expect(nearText).toHaveBeenCalledWith(
      "marketing copy",
      expect.objectContaining({ limit: 10, certainty: 0.7 }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].snippet).toHaveLength(500);
    expect(results[0].snippet).toBe("A".repeat(500));
    expect(results[0].score).toBe(0.85);
  });
});

describe("countContentByKnowledgeObject", () => {
  it("counts references across multiple ref properties", async () => {
    const fetchObjects = vi
      .fn()
      .mockResolvedValueOnce({ objects: [makeContentObj("a")] })
      .mockResolvedValueOnce({
        objects: [makeContentObj("b"), makeContentObj("c")],
      })
      .mockResolvedValueOnce({ objects: [] })
      .mockResolvedValueOnce({ objects: [makeContentObj("d")] });

    setupClient({
      query: { fetchObjects },
    });

    const count = await countContentByKnowledgeObject("ko-123");
    expect(count).toBe(4);
    expect(fetchObjects).toHaveBeenCalledTimes(4);
  });
});

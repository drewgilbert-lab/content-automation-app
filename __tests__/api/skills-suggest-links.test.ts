import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/skills", () => ({
  getSkill: vi.fn(),
}));

vi.mock("@/lib/weaviate", () => ({
  withWeaviate: vi.fn(),
}));

import { POST } from "@/app/api/skills/[id]/suggest-links/route";
import { getSkill } from "@/lib/skills";
import { withWeaviate } from "@/lib/weaviate";

const mockedGetSkill = vi.mocked(getSkill);
const mockedWithWeaviate = vi.mocked(withWeaviate);

describe("suggest-links route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when skill not found", async () => {
    mockedGetSkill.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/skills/bad-id/suggest-links", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "bad-id" }) });
    expect(res.status).toBe(404);
  });

  it("returns suggestions array on success", async () => {
    mockedGetSkill.mockResolvedValue({
      id: "skill-1",
      name: "Test Skill",
      description: "A test skill",
      content: "Some content about sales personas",
      active: true,
      contentType: ["email"],
      version: "1.0.0",
      tags: [],
      category: "content_generation",
      author: "admin",
      deprecated: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      usageCount: 0,
    } as any);

    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockClient = {
        collections: {
          use: () => ({
            query: {
              nearText: async () => ({
                objects: [
                  {
                    uuid: "obj-1",
                    properties: { name: "Sales Persona" },
                    metadata: { distance: 0.3 },
                  },
                ],
              }),
            },
          }),
        },
      };
      return fn(mockClient as any);
    });

    const req = new NextRequest("http://localhost:3000/api/skills/skill-1/suggest-links", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "skill-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.suggestions).toBeDefined();
    expect(Array.isArray(json.suggestions)).toBe(true);
  });

  it("filters out already-linked objects", async () => {
    mockedGetSkill.mockResolvedValue({
      id: "skill-1",
      name: "Test Skill",
      description: "desc",
      content: "content",
      active: true,
      contentType: [],
      version: "1.0.0",
      tags: [],
      category: "",
      author: "",
      deprecated: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      usageCount: 0,
      sourceKnowledgeObjects: [
        { id: "already-linked", collection: "persona", integrationPrompt: "test" },
      ],
    } as any);

    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockClient = {
        collections: {
          use: () => ({
            query: {
              nearText: async () => ({
                objects: [
                  {
                    uuid: "already-linked",
                    properties: { name: "Linked Persona" },
                    metadata: { distance: 0.1 },
                  },
                  {
                    uuid: "not-linked",
                    properties: { name: "New Persona" },
                    metadata: { distance: 0.2 },
                  },
                ],
              }),
            },
          }),
        },
      };
      return fn(mockClient as any);
    });

    const req = new NextRequest("http://localhost:3000/api/skills/skill-1/suggest-links", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "skill-1" }) });
    const json = await res.json();
    const ids = json.suggestions.map((s: { id: string }) => s.id);
    expect(ids).not.toContain("already-linked");
    expect(ids).toContain("not-linked");
  });
});

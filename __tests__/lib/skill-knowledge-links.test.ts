import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SkillKnowledgeLink } from "@/lib/skill-types";

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
import { createSkill, getSkill, updateSkill } from "@/lib/skills.ts";

const mockedWithWeaviate = vi.mocked(withWeaviate);

describe("SkillKnowledgeLink and sourceKnowledgeObjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts optional name on SkillKnowledgeLink", () => {
    const withName: SkillKnowledgeLink = {
      id: "obj-1",
      collection: "persona",
      name: "Sales Persona",
      integrationPrompt: "Keep tone aligned",
    };
    const minimal: SkillKnowledgeLink = {
      id: "obj-2",
      collection: "segment",
      integrationPrompt: "Segment context",
    };
    expect(withName.name).toBe("Sales Persona");
    expect(minimal.name).toBeUndefined();
  });

  it("getSkill parses sourceKnowledgeObjects from JSON string", async () => {
    const links: SkillKnowledgeLink[] = [
      {
        id: "obj-1",
        collection: "persona",
        name: "Sales Persona",
        integrationPrompt: "Update job titles",
      },
    ];
    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockClient = {
        collections: {
          use: (name: string) => {
            if (name === "Skill") {
              return {
                query: {
                  fetchObjectById: async () => ({
                    uuid: "skill-1",
                    properties: {
                      name: "Test Skill",
                      description: "desc",
                      content: "content",
                      active: true,
                      contentType: ["email"],
                      version: "1.0.0",
                      tags: [],
                      category: "content_generation",
                      author: "admin",
                      deprecated: false,
                      createdAt: "2026-01-01T00:00:00Z",
                      updatedAt: "2026-01-01T00:00:00Z",
                      sourceKnowledgeObjects: JSON.stringify(links),
                    },
                    references: {},
                  }),
                },
              };
            }
            return {
              query: { fetchObjects: async () => ({ objects: [] }) },
            };
          },
        },
      };
      return fn(mockClient as never);
    });

    const skill = await getSkill("skill-1");
    expect(skill).not.toBeNull();
    expect(skill!.sourceKnowledgeObjects).toEqual(links);
  });

  it("getSkill returns undefined for missing sourceKnowledgeObjects", async () => {
    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockClient = {
        collections: {
          use: (name: string) => {
            if (name === "Skill") {
              return {
                query: {
                  fetchObjectById: async () => ({
                    uuid: "skill-2",
                    properties: {
                      name: "No Links",
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
                    },
                    references: {},
                  }),
                },
              };
            }
            return {
              query: { fetchObjects: async () => ({ objects: [] }) },
            };
          },
        },
      };
      return fn(mockClient as never);
    });

    const skill = await getSkill("skill-2");
    expect(skill).not.toBeNull();
    expect(skill!.sourceKnowledgeObjects).toBeUndefined();
  });

  it("createSkill serializes sourceKnowledgeObjects to JSON", async () => {
    let insertedProperties: Record<string, unknown> = {};
    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockClient = {
        collections: {
          use: () => ({
            query: { fetchObjects: async () => ({ objects: [] }) },
            data: {
              insert: async (props: Record<string, unknown>) => {
                insertedProperties = props;
                return "new-skill-id";
              },
            },
          }),
        },
      };
      return fn(mockClient as never);
    });

    const links: SkillKnowledgeLink[] = [
      {
        id: "obj-1",
        collection: "persona",
        integrationPrompt: "Update persona refs",
      },
    ];
    await createSkill({
      name: "Test",
      description: "desc",
      content: "content",
      contentType: ["email"],
      sourceKnowledgeObjects: links,
    });

    expect(insertedProperties.sourceKnowledgeObjects).toBe(JSON.stringify(links));
  });

  it("updateSkill serializes sourceKnowledgeObjects to JSON", async () => {
    let updatedProperties: Record<string, unknown> = {};
    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockClient = {
        collections: {
          use: () => ({
            query: {
              fetchObjectById: async () => ({
                uuid: "skill-1",
                properties: { name: "Existing" },
              }),
              fetchObjects: async () => ({ objects: [] }),
            },
            data: {
              update: async ({
                properties,
              }: {
                id: string;
                properties: Record<string, unknown>;
              }) => {
                updatedProperties = properties;
              },
            },
          }),
        },
      };
      return fn(mockClient as never);
    });

    const links: SkillKnowledgeLink[] = [
      {
        id: "obj-2",
        collection: "segment",
        integrationPrompt: "Update segment context",
      },
    ];
    await updateSkill("skill-1", { sourceKnowledgeObjects: links });

    expect(updatedProperties.sourceKnowledgeObjects).toBe(JSON.stringify(links));
  });
});

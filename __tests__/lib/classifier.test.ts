import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildClassificationPrompt,
  parseClassificationJSON,
  resolveRelationships,
} from "@/lib/classifier";
import type { KnowledgeListItem } from "@/lib/knowledge-types";
import { VALID_TYPES } from "@/lib/knowledge-types";
import { CONFIDENCE_THRESHOLD } from "@/lib/classification-types";

const MOCK_OBJECTS: KnowledgeListItem[] = [
  {
    id: "uuid-persona-1",
    name: "Sales Engineer",
    type: "persona",
    tags: ["sales", "technical"],
    deprecated: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "uuid-segment-1",
    name: "Enterprise",
    type: "segment",
    tags: ["large", "enterprise"],
    deprecated: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "uuid-uc-1",
    name: "Territory Planning",
    type: "use_case",
    tags: ["planning"],
    deprecated: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "uuid-deprecated",
    name: "Old Persona",
    type: "persona",
    tags: [],
    deprecated: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-06-01T00:00:00Z",
  },
];

// ── buildClassificationPrompt ───────────────────────────────────────────────

describe("buildClassificationPrompt", () => {
  it("includes all valid knowledge types", () => {
    const prompt = buildClassificationPrompt(MOCK_OBJECTS);
    for (const type of VALID_TYPES) {
      expect(prompt).toContain(type);
    }
  });

  it("includes non-deprecated existing objects", () => {
    const prompt = buildClassificationPrompt(MOCK_OBJECTS);
    expect(prompt).toContain("Sales Engineer");
    expect(prompt).toContain("Enterprise");
    expect(prompt).toContain("Territory Planning");
  });

  it("excludes deprecated objects from inventory", () => {
    const prompt = buildClassificationPrompt(MOCK_OBJECTS);
    expect(prompt).not.toContain("Old Persona");
  });

  it("includes response format instructions", () => {
    const prompt = buildClassificationPrompt(MOCK_OBJECTS);
    expect(prompt).toContain("objectType");
    expect(prompt).toContain("objectName");
    expect(prompt).toContain("confidence");
    expect(prompt).toContain("suggestedRelationships");
  });

  it("works with an empty object list", () => {
    const prompt = buildClassificationPrompt([]);
    expect(prompt).toContain("(none)");
    for (const type of VALID_TYPES) {
      expect(prompt).toContain(type);
    }
  });
});

// ── parseClassificationJSON ─────────────────────────────────────────────────

describe("parseClassificationJSON", () => {
  it("parses a valid classification response", () => {
    const json = JSON.stringify({
      objectType: "persona",
      objectName: "Product Manager",
      tags: ["product", "management"],
      suggestedRelationships: [
        {
          targetName: "Enterprise",
          targetType: "segment",
          relationshipType: "hasSegments",
        },
      ],
      confidence: 0.85,
    });

    const result = parseClassificationJSON(json);
    expect(result.objectType).toBe("persona");
    expect(result.objectName).toBe("Product Manager");
    expect(result.tags).toEqual(["product", "management"]);
    expect(result.suggestedRelationships).toHaveLength(1);
    expect(result.confidence).toBe(0.85);
  });

  it("strips markdown code fences", () => {
    const json = '```json\n{"objectType":"segment","objectName":"SMB","tags":[],"suggestedRelationships":[],"confidence":0.9}\n```';
    const result = parseClassificationJSON(json);
    expect(result.objectType).toBe("segment");
    expect(result.objectName).toBe("SMB");
  });

  it("handles missing optional arrays gracefully", () => {
    const json = JSON.stringify({
      objectType: "use_case",
      objectName: "Pipeline Analysis",
      confidence: 0.75,
    });
    const result = parseClassificationJSON(json);
    expect(result.tags).toEqual([]);
    expect(result.suggestedRelationships).toEqual([]);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseClassificationJSON("not json at all")).toThrow();
  });

  it("throws on missing objectType", () => {
    const json = JSON.stringify({
      objectName: "Test",
      confidence: 0.5,
    });
    expect(() => parseClassificationJSON(json)).toThrow("objectType");
  });

  it("throws on missing objectName", () => {
    const json = JSON.stringify({
      objectType: "persona",
      confidence: 0.5,
    });
    expect(() => parseClassificationJSON(json)).toThrow("objectName");
  });

  it("throws on invalid confidence (negative)", () => {
    const json = JSON.stringify({
      objectType: "persona",
      objectName: "Test",
      confidence: -0.5,
    });
    expect(() => parseClassificationJSON(json)).toThrow("confidence");
  });

  it("throws on invalid confidence (> 1)", () => {
    const json = JSON.stringify({
      objectType: "persona",
      objectName: "Test",
      confidence: 1.5,
    });
    expect(() => parseClassificationJSON(json)).toThrow("confidence");
  });

  it("throws on missing confidence", () => {
    const json = JSON.stringify({
      objectType: "persona",
      objectName: "Test",
    });
    expect(() => parseClassificationJSON(json)).toThrow("confidence");
  });

  it("filters non-string tags", () => {
    const json = JSON.stringify({
      objectType: "persona",
      objectName: "Test",
      tags: ["valid", 123, null, "also-valid"],
      suggestedRelationships: [],
      confidence: 0.8,
    });
    const result = parseClassificationJSON(json);
    expect(result.tags).toEqual(["valid", "also-valid"]);
  });
});

// ── resolveRelationships ────────────────────────────────────────────────────

describe("resolveRelationships", () => {
  it("resolves target names to IDs from existing objects", () => {
    const raw = [
      {
        targetName: "Enterprise",
        targetType: "segment",
        relationshipType: "hasSegments",
      },
    ];
    const resolved = resolveRelationships(raw, MOCK_OBJECTS);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].targetId).toBe("uuid-segment-1");
    expect(resolved[0].targetName).toBe("Enterprise");
    expect(resolved[0].targetType).toBe("segment");
    expect(resolved[0].relationshipType).toBe("hasSegments");
  });

  it("ignores relationships with no matching object", () => {
    const raw = [
      {
        targetName: "Nonexistent Object",
        targetType: "persona",
        relationshipType: "hasPersonas",
      },
    ];
    const resolved = resolveRelationships(raw, MOCK_OBJECTS);
    expect(resolved).toHaveLength(0);
  });

  it("is case-insensitive on name matching", () => {
    const raw = [
      {
        targetName: "sales engineer",
        targetType: "persona",
        relationshipType: "hasPersonas",
      },
    ];
    const resolved = resolveRelationships(raw, MOCK_OBJECTS);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].targetId).toBe("uuid-persona-1");
  });

  it("requires both name and type to match", () => {
    const raw = [
      {
        targetName: "Enterprise",
        targetType: "persona",
        relationshipType: "hasPersonas",
      },
    ];
    const resolved = resolveRelationships(raw, MOCK_OBJECTS);
    expect(resolved).toHaveLength(0);
  });

  it("resolves multiple relationships", () => {
    const raw = [
      {
        targetName: "Sales Engineer",
        targetType: "persona",
        relationshipType: "hasPersonas",
      },
      {
        targetName: "Enterprise",
        targetType: "segment",
        relationshipType: "hasSegments",
      },
      {
        targetName: "Ghost",
        targetType: "use_case",
        relationshipType: "hasUseCases",
      },
    ];
    const resolved = resolveRelationships(raw, MOCK_OBJECTS);
    expect(resolved).toHaveLength(2);
  });

  it("returns empty for empty input", () => {
    expect(resolveRelationships([], MOCK_OBJECTS)).toEqual([]);
  });
});

// ── Confidence threshold ────────────────────────────────────────────────────

describe("CONFIDENCE_THRESHOLD", () => {
  it("is set to 0.7", () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.7);
  });

  it("determines needsReview flag behavior", () => {
    expect(0.65 < CONFIDENCE_THRESHOLD).toBe(true);
    expect(0.7 < CONFIDENCE_THRESHOLD).toBe(false);
    expect(0.85 < CONFIDENCE_THRESHOLD).toBe(false);
  });
});

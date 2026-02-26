import { describe, it, expect } from "vitest";
import {
  serializeSession,
  getEffectiveClassification,
  SESSION_TTL_MS,
  SESSION_CLEANUP_INTERVAL_MS,
} from "@/lib/upload-session-types";
import type { UploadSession } from "@/lib/upload-session-types";
import type { ParsedDocument } from "@/lib/document-parser-types";
import type { ClassificationResult } from "@/lib/classification-types";

function mockDoc(filename: string, content = "test content"): ParsedDocument {
  return {
    filename,
    format: "md",
    content,
    wordCount: content.split(/\s+/).length,
    errors: [],
  };
}

function mockClassification(filename: string): ClassificationResult {
  return {
    filename,
    objectType: "persona",
    objectName: "Test Persona",
    tags: ["test"],
    suggestedRelationships: [],
    confidence: 0.9,
    needsReview: false,
  };
}

function createTestSession(overrides?: Partial<UploadSession>): UploadSession {
  const now = new Date();
  return {
    id: "test-id",
    documents: [mockDoc("a.md"), mockDoc("b.md")],
    classifications: new Map(),
    userEdits: new Map(),
    status: "parsing",
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    ...overrides,
  };
}

describe("serializeSession", () => {
  it("converts Maps to arrays", () => {
    const session = createTestSession();
    session.classifications.set(0, mockClassification("a.md"));
    session.userEdits.set(1, { objectName: "Edited" });

    const serialized = serializeSession(session);

    expect(serialized.classifications).toHaveLength(1);
    expect(serialized.classifications[0].index).toBe(0);
    expect(serialized.classifications[0].classification.filename).toBe("a.md");

    expect(serialized.userEdits).toHaveLength(1);
    expect(serialized.userEdits[0].index).toBe(1);
    expect(serialized.userEdits[0].edits.objectName).toBe("Edited");
  });

  it("converts dates to ISO strings", () => {
    const session = createTestSession();
    const serialized = serializeSession(session);

    expect(serialized.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(serialized.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("converts documents to serialized format", () => {
    const docs = [
      mockDoc("a.md", "hello world"),
      mockDoc("b.md", "foo bar baz"),
    ];
    const session = createTestSession({ documents: docs });
    const serialized = serializeSession(session);

    expect(serialized.documents).toHaveLength(2);
    expect(serialized.documents[0]).toEqual({
      index: 0,
      filename: "a.md",
      format: "md",
      content: "hello world",
      wordCount: 2,
      parseErrors: [],
    });
    expect(serialized.documents[1]).toEqual({
      index: 1,
      filename: "b.md",
      format: "md",
      content: "foo bar baz",
      wordCount: 3,
      parseErrors: [],
    });
  });
});

describe("getEffectiveClassification", () => {
  it("returns null when no classification exists", () => {
    const session = createTestSession();
    expect(getEffectiveClassification(session, 0)).toBeNull();
    expect(getEffectiveClassification(session, 5)).toBeNull();
  });

  it("returns base when no edits", () => {
    const session = createTestSession();
    const classification = mockClassification("a.md");
    session.classifications.set(0, classification);

    const result = getEffectiveClassification(session, 0);
    expect(result).toEqual(classification);
  });

  it("returns merged when edits exist", () => {
    const session = createTestSession();
    const classification = mockClassification("a.md");
    session.classifications.set(0, classification);
    session.userEdits.set(0, { objectName: "Edited Name", tags: ["extra"] });

    const result = getEffectiveClassification(session, 0);
    expect(result).not.toBeNull();
    expect(result!.objectName).toBe("Edited Name");
    expect(result!.tags).toEqual(["extra"]);
    expect(result!.filename).toBe("a.md");
    expect(result!.objectType).toBe("persona");
  });
});

describe("constants", () => {
  it("SESSION_TTL_MS is 86400000", () => {
    expect(SESSION_TTL_MS).toBe(86400000);
  });

  it("SESSION_CLEANUP_INTERVAL_MS is 3600000", () => {
    expect(SESSION_CLEANUP_INTERVAL_MS).toBe(3600000);
  });
});

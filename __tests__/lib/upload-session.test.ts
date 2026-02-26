import { describe, it, expect, beforeEach } from "vitest";
import {
  createSession,
  getSession,
  getSerializedSession,
  updateSessionStatus,
  setClassification,
  setUserEdit,
  deleteSession,
  _clearAllSessions,
  _getSessionCount,
} from "@/lib/upload-session";
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

beforeEach(() => {
  _clearAllSessions();
});

describe("createSession", () => {
  it("creates a session with correct fields", () => {
    const docs = [mockDoc("a.md"), mockDoc("b.md")];
    const session = createSession(docs);

    expect(session.id).toBeDefined();
    expect(session.documents).toEqual(docs);
    expect(session.classifications).toBeInstanceOf(Map);
    expect(session.classifications.size).toBe(0);
    expect(session.userEdits).toBeInstanceOf(Map);
    expect(session.userEdits.size).toBe(0);
    expect(session.status).toBe("parsing");
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.expiresAt).toBeInstanceOf(Date);
  });

  it("generates unique ids", () => {
    const s1 = createSession([mockDoc("a.md")]);
    const s2 = createSession([mockDoc("b.md")]);
    expect(s1.id).not.toBe(s2.id);
  });

  it("sets status to parsing", () => {
    const session = createSession([mockDoc("a.md")]);
    expect(session.status).toBe("parsing");
  });

  it("stores documents", () => {
    const docs = [mockDoc("a.md", "hello world"), mockDoc("b.md")];
    const session = createSession(docs);
    expect(session.documents).toHaveLength(2);
    expect(session.documents[0].filename).toBe("a.md");
    expect(session.documents[0].content).toBe("hello world");
  });

  it("sets expiresAt to 24h from now", () => {
    const before = Date.now();
    const session = createSession([mockDoc("a.md")]);
    const after = Date.now();
    const expiresMs = session.expiresAt.getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + 86400000);
    expect(expiresMs).toBeLessThanOrEqual(after + 86400000);
  });
});

describe("getSession", () => {
  it("returns session by id", () => {
    const docs = [mockDoc("a.md")];
    const created = createSession(docs);
    const found = getSession(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.documents).toEqual(docs);
  });

  it("returns null for unknown id", () => {
    expect(getSession("unknown-id")).toBeNull();
  });
});

describe("getSerializedSession", () => {
  it("returns serialized version", () => {
    const docs = [mockDoc("a.md")];
    const created = createSession(docs);
    const serialized = getSerializedSession(created.id);
    expect(serialized).not.toBeNull();
    expect(serialized!.id).toBe(created.id);
    expect(serialized!.documents).toHaveLength(1);
    expect(serialized!.documents[0].filename).toBe("a.md");
    expect(serialized!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(serialized!.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null for unknown id", () => {
    expect(getSerializedSession("unknown-id")).toBeNull();
  });
});

describe("updateSessionStatus", () => {
  it("updates status", () => {
    const session = createSession([mockDoc("a.md")]);
    const ok = updateSessionStatus(session.id, "classifying");
    expect(ok).toBe(true);
    expect(getSession(session.id)!.status).toBe("classifying");

    updateSessionStatus(session.id, "reviewing");
    expect(getSession(session.id)!.status).toBe("reviewing");

    updateSessionStatus(session.id, "approved");
    expect(getSession(session.id)!.status).toBe("approved");
  });

  it("returns false for unknown session", () => {
    expect(updateSessionStatus("unknown-id", "classifying")).toBe(false);
  });
});

describe("setClassification", () => {
  it("stores classification at index", () => {
    const docs = [mockDoc("a.md"), mockDoc("b.md")];
    const session = createSession(docs);
    const classification = mockClassification("a.md");

    const ok = setClassification(session.id, 0, classification);
    expect(ok).toBe(true);
    expect(getSession(session.id)!.classifications.get(0)).toEqual(classification);
  });

  it("returns false for invalid index", () => {
    const session = createSession([mockDoc("a.md")]);
    const classification = mockClassification("a.md");

    expect(setClassification(session.id, -1, classification)).toBe(false);
    expect(setClassification(session.id, 1, classification)).toBe(false);
  });

  it("returns false for unknown session", () => {
    expect(
      setClassification("unknown-id", 0, mockClassification("a.md"))
    ).toBe(false);
  });
});

describe("setUserEdit", () => {
  it("stores edits", () => {
    const session = createSession([mockDoc("a.md")]);
    setClassification(session.id, 0, mockClassification("a.md"));

    const ok = setUserEdit(session.id, 0, { objectName: "Edited Name" });
    expect(ok).toBe(true);
    expect(getSession(session.id)!.userEdits.get(0)).toEqual({
      objectName: "Edited Name",
    });
  });

  it("merges with existing edits", () => {
    const session = createSession([mockDoc("a.md")]);
    setClassification(session.id, 0, mockClassification("a.md"));
    setUserEdit(session.id, 0, { objectName: "First" });
    setUserEdit(session.id, 0, { tags: ["new-tag"] });

    const edits = getSession(session.id)!.userEdits.get(0)!;
    expect(edits.objectName).toBe("First");
    expect(edits.tags).toEqual(["new-tag"]);
  });

  it("returns false for invalid index", () => {
    const session = createSession([mockDoc("a.md")]);
    expect(setUserEdit(session.id, -1, { objectName: "x" })).toBe(false);
    expect(setUserEdit(session.id, 1, { objectName: "x" })).toBe(false);
  });

  it("returns false for unknown session", () => {
    expect(setUserEdit("unknown-id", 0, { objectName: "x" })).toBe(false);
  });
});

describe("deleteSession", () => {
  it("removes session", () => {
    const session = createSession([mockDoc("a.md")]);
    const ok = deleteSession(session.id);
    expect(ok).toBe(true);
    expect(getSession(session.id)).toBeNull();
  });

  it("returns false for unknown id", () => {
    expect(deleteSession("unknown-id")).toBe(false);
  });
});

describe("_getSessionCount", () => {
  it("returns correct count", () => {
    expect(_getSessionCount()).toBe(0);
    createSession([mockDoc("a.md")]);
    expect(_getSessionCount()).toBe(1);
    createSession([mockDoc("b.md")]);
    expect(_getSessionCount()).toBe(2);
  });
});

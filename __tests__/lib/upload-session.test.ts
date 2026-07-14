import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Redis } from "@upstash/redis";
import type { ParsedDocument } from "@/lib/document-parser-types";
import type { ClassificationResult } from "@/lib/classification-types";
import {
  createSession,
  getSession,
  getSerializedSession,
  updateSessionStatus,
  setClassification,
  setUserEdit,
  deleteSession,
  addDocumentToSession,
  _clearAllSessions,
  _getSessionCount,
  _setRedisForTesting,
} from "@/lib/upload-session";

// --- Fake Redis backed by an in-memory Map ---

const store = new Map<string, string>();

const mockGet = vi.fn(async (key: string) => {
  const raw = store.get(key);
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
});

const mockSet = vi.fn(
  async (
    key: string,
    value: unknown,
    opts?: { ex?: number; nx?: boolean; px?: number }
  ) => {
    if (opts?.nx && store.has(key)) {
      return null;
    }
    store.set(key, JSON.stringify(value));
    return "OK";
  }
);

const mockDel = vi.fn(async (...keys: string[]) => {
  let count = 0;
  for (const k of keys) {
    if (store.delete(k)) count++;
  }
  return count;
});

const mockTtl = vi.fn(async () => 80000);

const mockScan = vi.fn(
  async (
    _cursor: string | number,
    opts?: { match?: string; count?: number }
  ) => {
    const prefix = (opts?.match ?? "").replace("*", "");
    const keys = Array.from(store.keys()).filter((k) => k.startsWith(prefix));
    return ["0", keys];
  }
);

const fakeRedis = {
  get: mockGet,
  set: mockSet,
  del: mockDel,
  ttl: mockTtl,
  scan: mockScan,
} as unknown as Redis;

// --- Helpers ---

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
  store.clear();
  vi.clearAllMocks();
  _setRedisForTesting(fakeRedis);
});

describe("createSession", () => {
  it("creates a session with correct fields", async () => {
    const docs = [mockDoc("a.md"), mockDoc("b.md")];
    const session = await createSession(docs);

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

  it("generates unique ids", async () => {
    const s1 = await createSession([mockDoc("a.md")]);
    const s2 = await createSession([mockDoc("b.md")]);
    expect(s1.id).not.toBe(s2.id);
  });

  it("stores session in Redis with 24h TTL", async () => {
    const session = await createSession([mockDoc("a.md")]);

    expect(mockSet).toHaveBeenCalledTimes(1);
    const [key, , opts] = mockSet.mock.calls[0];
    expect(key).toBe(`upload-session:${session.id}`);
    expect(opts).toEqual({ ex: 86400 });
  });

  it("sets expiresAt to 24h from now", async () => {
    const before = Date.now();
    const session = await createSession([mockDoc("a.md")]);
    const after = Date.now();
    const expiresMs = session.expiresAt.getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + 86400000);
    expect(expiresMs).toBeLessThanOrEqual(after + 86400000);
  });
});

describe("getSession", () => {
  it("returns session by id", async () => {
    const docs = [mockDoc("a.md")];
    const created = await createSession(docs);
    const found = await getSession(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.documents).toEqual(docs);
    expect(found!.classifications).toBeInstanceOf(Map);
    expect(found!.createdAt).toBeInstanceOf(Date);
  });

  it("returns null for unknown id", async () => {
    expect(await getSession("unknown-id")).toBeNull();
  });
});

describe("getSerializedSession", () => {
  it("returns serialized version", async () => {
    const docs = [mockDoc("a.md")];
    const created = await createSession(docs);
    const serialized = await getSerializedSession(created.id);

    expect(serialized).not.toBeNull();
    expect(serialized!.id).toBe(created.id);
    expect(serialized!.documents).toHaveLength(1);
    expect(serialized!.documents[0].filename).toBe("a.md");
    expect(serialized!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(serialized!.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null for unknown id", async () => {
    expect(await getSerializedSession("unknown-id")).toBeNull();
  });
});

describe("updateSessionStatus", () => {
  it("updates status and persists to Redis", async () => {
    const session = await createSession([mockDoc("a.md")]);
    const ok = await updateSessionStatus(session.id, "classifying");
    expect(ok).toBe(true);

    const updated = await getSession(session.id);
    expect(updated!.status).toBe("classifying");
  });

  it("preserves remaining TTL on update", async () => {
    const session = await createSession([mockDoc("a.md")]);
    mockTtl.mockResolvedValueOnce(50000);

    await updateSessionStatus(session.id, "reviewing");

    const lastSetCall = mockSet.mock.calls[mockSet.mock.calls.length - 1];
    expect(lastSetCall[2]).toEqual({ ex: 50000 });
  });

  it("returns false for unknown session", async () => {
    expect(await updateSessionStatus("unknown-id", "classifying")).toBe(false);
  });
});

describe("setClassification", () => {
  it("stores classification at index", async () => {
    const docs = [mockDoc("a.md"), mockDoc("b.md")];
    const session = await createSession(docs);
    const classification = mockClassification("a.md");

    const ok = await setClassification(session.id, 0, classification);
    expect(ok).toBe(true);

    const found = await getSession(session.id);
    expect(found!.classifications.get(0)).toEqual(classification);
  });

  it("returns false for invalid index", async () => {
    const session = await createSession([mockDoc("a.md")]);
    const classification = mockClassification("a.md");

    expect(await setClassification(session.id, -1, classification)).toBe(false);
    expect(await setClassification(session.id, 1, classification)).toBe(false);
  });

  it("returns false for unknown session", async () => {
    expect(
      await setClassification("unknown-id", 0, mockClassification("a.md"))
    ).toBe(false);
  });
});

describe("setUserEdit", () => {
  it("stores edits", async () => {
    const session = await createSession([mockDoc("a.md")]);
    await setClassification(session.id, 0, mockClassification("a.md"));

    const ok = await setUserEdit(session.id, 0, { objectName: "Edited Name" });
    expect(ok).toBe(true);

    const found = await getSession(session.id);
    expect(found!.userEdits.get(0)).toEqual({ objectName: "Edited Name" });
  });

  it("merges with existing edits", async () => {
    const session = await createSession([mockDoc("a.md")]);
    await setClassification(session.id, 0, mockClassification("a.md"));
    await setUserEdit(session.id, 0, { objectName: "First" });
    await setUserEdit(session.id, 0, { tags: ["new-tag"] });

    const found = await getSession(session.id);
    const edits = found!.userEdits.get(0)!;
    expect(edits.objectName).toBe("First");
    expect(edits.tags).toEqual(["new-tag"]);
  });

  it("returns false for invalid index", async () => {
    const session = await createSession([mockDoc("a.md")]);
    expect(await setUserEdit(session.id, -1, { objectName: "x" })).toBe(false);
    expect(await setUserEdit(session.id, 1, { objectName: "x" })).toBe(false);
  });

  it("returns false for unknown session", async () => {
    expect(await setUserEdit("unknown-id", 0, { objectName: "x" })).toBe(
      false
    );
  });
});

describe("deleteSession", () => {
  it("removes session from Redis", async () => {
    const session = await createSession([mockDoc("a.md")]);
    const ok = await deleteSession(session.id);
    expect(ok).toBe(true);
    expect(await getSession(session.id)).toBeNull();
  });

  it("returns false for unknown id", async () => {
    expect(await deleteSession("unknown-id")).toBe(false);
  });

  it("calls Redis del with correct key", async () => {
    const session = await createSession([mockDoc("a.md")]);
    await deleteSession(session.id);

    expect(mockDel).toHaveBeenCalledWith(`upload-session:${session.id}`);
  });
});

describe("_getSessionCount", () => {
  it("returns correct count", async () => {
    expect(await _getSessionCount()).toBe(0);
    await createSession([mockDoc("a.md")]);
    expect(await _getSessionCount()).toBe(1);
    await createSession([mockDoc("b.md")]);
    expect(await _getSessionCount()).toBe(2);
  });
});

describe("_clearAllSessions", () => {
  it("removes all sessions", async () => {
    await createSession([mockDoc("a.md")]);
    await createSession([mockDoc("b.md")]);
    expect(await _getSessionCount()).toBe(2);

    await _clearAllSessions();
    expect(await _getSessionCount()).toBe(0);
  });
});

describe("addDocumentToSession", () => {
  it("appends a document and returns the new index", async () => {
    const session = await createSession([]);
    const result = await addDocumentToSession(session.id, mockDoc("first.md"));
    expect(result).toEqual({ index: 0 });

    const second = await addDocumentToSession(session.id, mockDoc("second.md"));
    expect(second).toEqual({ index: 1 });

    const found = await getSession(session.id);
    expect(found!.documents).toHaveLength(2);
    expect(found!.documents[0].filename).toBe("first.md");
    expect(found!.documents[1].filename).toBe("second.md");
  });

  it("returns null for unknown session", async () => {
    expect(await addDocumentToSession("unknown-id", mockDoc("a.md"))).toBeNull();
  });

  it("creates an empty session via createSession([])", async () => {
    const session = await createSession([]);
    expect(session.documents).toEqual([]);
    expect(session.status).toBe("parsing");
  });

  it("keeps all documents under concurrent appends (success criterion C)", async () => {
    const session = await createSession([]);
    const results = await Promise.all([
      addDocumentToSession(session.id, mockDoc("a.md", "one")),
      addDocumentToSession(session.id, mockDoc("b.md", "two")),
      addDocumentToSession(session.id, mockDoc("c.md", "three")),
    ]);

    expect(results.every((r) => r !== null)).toBe(true);
    const indexes = results.map((r) => r!.index).sort((a, b) => a - b);
    expect(indexes).toEqual([0, 1, 2]);

    const found = await getSession(session.id);
    expect(found!.documents).toHaveLength(3);
    const names = found!.documents.map((d) => d.filename).sort();
    expect(names).toEqual(["a.md", "b.md", "c.md"]);
  });
});

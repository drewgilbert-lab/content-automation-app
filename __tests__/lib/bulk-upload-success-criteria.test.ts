/**
 * Bulk Upload Multi-File Success Criteria (definition of done)
 *
 * A. Preconditions — signed-in contributor+, supported files within limits
 * B. Session creation — POST /session → durable sessionId readable by later requests
 * C. Per-file parse — each POST /parse-single appends; GET session has N docs
 * D. Classification — SSE completes; classifications on session
 * E. Approve — pending Weaviate Submissions for approved indexes
 *
 * This suite locks criteria B–C at the store layer (multi-file append durability).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Redis } from "@upstash/redis";
import type { ParsedDocument } from "@/lib/document-parser-types";
import {
  createSession,
  addDocumentToSession,
  getSession,
  getSerializedSession,
  _setRedisForTesting,
} from "@/lib/upload-session";

const store = new Map<string, string>();

const fakeRedis = {
  get: vi.fn(async (key: string) => {
    const raw = store.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }),
  set: vi.fn(
    async (
      key: string,
      value: unknown,
      opts?: { nx?: boolean; px?: number; ex?: number }
    ) => {
      if (opts?.nx && store.has(key)) return null;
      store.set(key, JSON.stringify(value));
      return "OK";
    }
  ),
  del: vi.fn(async (...keys: string[]) => {
    let n = 0;
    for (const k of keys) if (store.delete(k)) n++;
    return n;
  }),
  ttl: vi.fn(async () => 80000),
  scan: vi.fn(async () => ["0", []]),
} as unknown as Redis;

function doc(filename: string): ParsedDocument {
  return {
    filename,
    format: "md",
    content: `content of ${filename}`,
    wordCount: 3,
    errors: [],
  };
}

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  _setRedisForTesting(fakeRedis);
});

describe("Bulk upload success criteria B–C", () => {
  it("B: createSession returns a sessionId that getSession can read", async () => {
    const session = await createSession([]);
    expect(session.id).toBeTruthy();
    const found = await getSession(session.id);
    expect(found).not.toBeNull();
    expect(found!.documents).toEqual([]);
  });

  it("C: two concurrent files both land in the same session", async () => {
    const session = await createSession([]);
    const [a, b] = await Promise.all([
      addDocumentToSession(session.id, doc("one.md")),
      addDocumentToSession(session.id, doc("two.md")),
    ]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();

    const serialized = await getSerializedSession(session.id);
    expect(serialized).not.toBeNull();
    expect(serialized!.documents).toHaveLength(2);
    const names = serialized!.documents.map((d) => d.filename).sort();
    expect(names).toEqual(["one.md", "two.md"]);
  });
});

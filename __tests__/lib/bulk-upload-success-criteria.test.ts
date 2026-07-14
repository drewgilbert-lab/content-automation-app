/**
 * Bulk Upload Multi-File Success Criteria (definition of done)
 *
 * A. Preconditions — signed-in contributor+, supported files within limits
 * B. Session creation — POST /session → durable sessionId readable by later requests
 * C. Per-file parse — each POST /parse-single appends; GET session has N docs
 * D. Classification — SSE completes; classifications on session
 * E. Approve — pending Weaviate Submissions for approved indexes
 *
 * This suite locks criteria B–C at the store layer (multi-file append durability)
 * and the production failure modes we confirmed: concurrent RMW loss on the old
 * blob store, and wizard concurrency must stay sequential.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ParsedDocument } from "@/lib/document-parser-types";
import {
  createSession,
  addDocumentToSession,
  getSession,
  getSerializedSession,
  _setRedisForTesting,
} from "@/lib/upload-session";
import { createFakeUploadRedis } from "../helpers/fake-upload-redis";
import { UPLOAD_CONCURRENCY } from "@/lib/bulk-upload-constants";
import { asUploadBlob } from "@/lib/upload-blob";

const fake = createFakeUploadRedis();

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
  fake.clear();
  vi.clearAllMocks();
  _setRedisForTesting(fake.redis);
});

describe("Bulk upload success criteria B–C", () => {
  it("B: createSession returns a sessionId that getSession can read", async () => {
    const session = await createSession([]);
    expect(session.id).toBeTruthy();
    const found = await getSession(session.id);
    expect(found).not.toBeNull();
    expect(found!.documents).toEqual([]);
  });

  it("C: two concurrent files both land in the same session (atomic LIST)", async () => {
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

  it("C regression: delayed concurrent appends still keep N docs (old RMW lost siblings)", async () => {
    // Simulate network delay on RPUSH; LIST must still retain every document
    // (the production failure mode under concurrent parse-single on the old blob store).
    const originalRpush = fake.redis.rpush.bind(fake.redis);
    fake.redis.rpush = vi.fn(async (key: string, ...values: unknown[]) => {
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 20));
      return originalRpush(key, ...values);
    }) as typeof fake.redis.rpush;

    const session = await createSession([]);
    const results = await Promise.all([
      addDocumentToSession(session.id, doc("a.md")),
      addDocumentToSession(session.id, doc("b.md")),
      addDocumentToSession(session.id, doc("c.md")),
    ]);
    expect(results.every((r) => r !== null)).toBe(true);
    const indexes = results.map((r) => r!.index).sort((a, b) => a - b);
    expect(indexes).toEqual([0, 1, 2]);

    const found = await getSession(session.id);
    expect(found!.documents).toHaveLength(3);
    expect(found!.documents.map((d) => d.filename).sort()).toEqual([
      "a.md",
      "b.md",
      "c.md",
    ]);
  });
});

describe("Bulk upload deploy / wizard regressions", () => {
  it("wizard uploads sequentially (concurrency 1) so parse-single cannot RMW-race", () => {
    expect(UPLOAD_CONCURRENCY).toBe(1);
  });

  it("asUploadBlob accepts File and rejects string (TS2677-safe, no value-is-Blob predicate)", () => {
    const file = new File(["x"], "x.md", { type: "text/markdown" });
    expect(asUploadBlob(file)).toBe(file);
    expect(asUploadBlob("not-a-file")).toBeNull();
    expect(asUploadBlob(null)).toBeNull();
  });
});

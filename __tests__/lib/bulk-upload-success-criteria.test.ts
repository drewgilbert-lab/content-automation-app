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
import type { ParsedDocument } from "@/lib/document-parser-types";
import {
  createSession,
  addDocumentToSession,
  getSession,
  getSerializedSession,
  _setRedisForTesting,
} from "@/lib/upload-session";
import { createFakeUploadRedis } from "../helpers/fake-upload-redis";

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
});

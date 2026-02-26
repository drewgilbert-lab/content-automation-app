import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/knowledge", () => ({
  listKnowledgeObjects: vi.fn(),
}));

vi.mock("@/lib/classifier", () => ({
  classifyDocument: vi.fn(),
}));

import { POST } from "@/app/api/bulk-upload/classify/route";
import { listKnowledgeObjects } from "@/lib/knowledge";
import { classifyDocument } from "@/lib/classifier";
import { NextRequest } from "next/server";
import type { ClassificationResult } from "@/lib/classification-types";

const mockedListKnowledge = vi.mocked(listKnowledgeObjects);
const mockedClassify = vi.mocked(classifyDocument);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/bulk-upload/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function parseSSE(
  response: Response
): Promise<{ event: string; data: Record<string, unknown> }[]> {
  const text = await response.text();
  const events: { event: string; data: Record<string, unknown> }[] = [];

  const blocks = text.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7);
      if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (event && data) {
      events.push({ event, data: JSON.parse(data) });
    }
  }
  return events;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedListKnowledge.mockResolvedValue([
    {
      id: "uuid-1",
      name: "Sales Engineer",
      type: "persona",
      tags: ["sales"],
      deprecated: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-06-01T00:00:00Z",
    },
  ]);
});

// ── Validation ──────────────────────────────────────────────────────────────

describe("POST /api/bulk-upload/classify — validation", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/bulk-upload/classify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid JSON");
  });

  it("returns 400 when documents is not an array", async () => {
    const res = await POST(makeRequest({ documents: "not-array" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("must be an array");
  });

  it("returns 400 when documents array is empty", async () => {
    const res = await POST(makeRequest({ documents: [] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("must not be empty");
  });

  it("returns 400 when a document is missing filename", async () => {
    const res = await POST(
      makeRequest({
        documents: [{ content: "some text" }],
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("filename is required");
  });

  it("returns 400 when batch exceeds 50 documents", async () => {
    const docs = Array.from({ length: 51 }, (_, i) => ({
      filename: `doc${i}.txt`,
      content: "text",
    }));
    const res = await POST(makeRequest({ documents: docs }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("exceeding the limit of 50");
  });
});

// ── SSE streaming ───────────────────────────────────────────────────────────

describe("POST /api/bulk-upload/classify — SSE stream", () => {
  it("returns text/event-stream content type", async () => {
    const mockResult: ClassificationResult = {
      filename: "doc.md",
      objectType: "persona",
      objectName: "Test Persona",
      tags: ["test"],
      suggestedRelationships: [],
      confidence: 0.9,
      needsReview: false,
    };
    mockedClassify.mockResolvedValue(mockResult);

    const res = await POST(
      makeRequest({
        documents: [
          { filename: "doc.md", format: "md", content: "Test content", wordCount: 2 },
        ],
      })
    );

    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("emits progress, result, and done events for successful classification", async () => {
    const mockResult: ClassificationResult = {
      filename: "doc.md",
      objectType: "persona",
      objectName: "Test Persona",
      tags: ["test"],
      suggestedRelationships: [],
      confidence: 0.9,
      needsReview: false,
    };
    mockedClassify.mockResolvedValue(mockResult);

    const res = await POST(
      makeRequest({
        documents: [
          { filename: "doc.md", format: "md", content: "Test content", wordCount: 2 },
        ],
      })
    );

    const events = await parseSSE(res);

    expect(events.length).toBe(3);

    expect(events[0].event).toBe("progress");
    expect(events[0].data.index).toBe(0);
    expect(events[0].data.total).toBe(1);
    expect(events[0].data.filename).toBe("doc.md");
    expect(events[0].data.status).toBe("classifying");

    expect(events[1].event).toBe("result");
    expect(events[1].data.index).toBe(0);
    expect((events[1].data.classification as Record<string, unknown>).objectType).toBe("persona");

    expect(events[2].event).toBe("done");
    expect(events[2].data.total).toBe(1);
    expect(events[2].data.classified).toBe(1);
    expect(events[2].data.failed).toBe(0);
  });

  it("emits error event when classification fails and continues", async () => {
    const mockResult: ClassificationResult = {
      filename: "good.md",
      objectType: "use_case",
      objectName: "Good Doc",
      tags: [],
      suggestedRelationships: [],
      confidence: 0.8,
      needsReview: false,
    };

    mockedClassify
      .mockRejectedValueOnce(new Error("Claude API error"))
      .mockResolvedValueOnce(mockResult);

    const res = await POST(
      makeRequest({
        documents: [
          { filename: "bad.md", format: "md", content: "Bad doc", wordCount: 2 },
          { filename: "good.md", format: "md", content: "Good doc", wordCount: 2 },
        ],
      })
    );

    const events = await parseSSE(res);

    const errorEvents = events.filter((e) => e.event === "error");
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].data.filename).toBe("bad.md");
    expect((errorEvents[0].data.error as string)).toContain("Claude API error");

    const resultEvents = events.filter((e) => e.event === "result");
    expect(resultEvents).toHaveLength(1);
    expect(resultEvents[0].data.filename).toBe("good.md");

    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents).toHaveLength(1);
    expect(doneEvents[0].data.classified).toBe(1);
    expect(doneEvents[0].data.failed).toBe(1);
  });

  it("emits error for documents with empty content", async () => {
    const res = await POST(
      makeRequest({
        documents: [
          { filename: "empty.txt", format: "txt", content: "", wordCount: 0 },
        ],
      })
    );

    const events = await parseSSE(res);

    const errorEvents = events.filter((e) => e.event === "error");
    expect(errorEvents).toHaveLength(1);
    expect((errorEvents[0].data.error as string)).toContain("no extractable content");

    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents[0].data.failed).toBe(1);
    expect(doneEvents[0].data.classified).toBe(0);
  });

  it("processes multiple documents sequentially with progress events", async () => {
    mockedClassify.mockImplementation(async (doc) => ({
      filename: doc.filename,
      objectType: "persona" as const,
      objectName: `Classified ${doc.filename}`,
      tags: [],
      suggestedRelationships: [],
      confidence: 0.85,
      needsReview: false,
    }));

    const res = await POST(
      makeRequest({
        documents: [
          { filename: "a.md", format: "md", content: "Content A", wordCount: 2 },
          { filename: "b.md", format: "md", content: "Content B", wordCount: 2 },
          { filename: "c.md", format: "md", content: "Content C", wordCount: 2 },
        ],
      })
    );

    const events = await parseSSE(res);

    const progressEvents = events.filter((e) => e.event === "progress");
    expect(progressEvents).toHaveLength(3);
    expect(progressEvents[0].data.index).toBe(0);
    expect(progressEvents[1].data.index).toBe(1);
    expect(progressEvents[2].data.index).toBe(2);

    const resultEvents = events.filter((e) => e.event === "result");
    expect(resultEvents).toHaveLength(3);

    const doneEvents = events.filter((e) => e.event === "done");
    expect(doneEvents[0].data.total).toBe(3);
    expect(doneEvents[0].data.classified).toBe(3);
  });
});

// ── Error handling ──────────────────────────────────────────────────────────

describe("POST /api/bulk-upload/classify — error handling", () => {
  it("returns 500 when listKnowledgeObjects fails", async () => {
    mockedListKnowledge.mockRejectedValueOnce(new Error("Weaviate down"));

    const res = await POST(
      makeRequest({
        documents: [
          { filename: "doc.md", content: "test" },
        ],
      })
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Failed to fetch existing knowledge objects");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/upload-session", () => ({
  getSession: vi.fn(),
  setClassification: vi.fn(),
}));

vi.mock("@/lib/knowledge", () => ({
  listKnowledgeObjects: vi.fn(),
}));

vi.mock("@/lib/classifier", () => ({
  classifyDocument: vi.fn(),
}));

import { POST } from "@/app/api/bulk-upload/reclassify/route";
import { getSession, setClassification } from "@/lib/upload-session";
import { listKnowledgeObjects } from "@/lib/knowledge";
import { classifyDocument } from "@/lib/classifier";
import { NextRequest } from "next/server";

const mockedGetSession = vi.mocked(getSession);
const mockedSetClassification = vi.mocked(setClassification);
const mockedListKnowledge = vi.mocked(listKnowledgeObjects);
const mockedClassify = vi.mocked(classifyDocument);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/bulk-upload/reclassify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const session = {
  id: "session-123",
  documents: [
    {
      filename: "test.md",
      format: "md" as const,
      content: "some content",
      wordCount: 2,
      errors: [] as string[],
    },
  ],
  classifications: new Map(),
  userEdits: new Map(),
  status: "reviewing" as const,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedListKnowledge.mockResolvedValue([]);
});

describe("POST /api/bulk-upload/reclassify", () => {
  it("returns 400 when sessionId is missing", async () => {
    const res = await POST(makeRequest({ documentIndex: 0 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("sessionId");
  });

  it("returns 400 when documentIndex is missing or not an integer", async () => {
    const res1 = await POST(makeRequest({ sessionId: "session-123" }));
    expect(res1.status).toBe(400);
    const json1 = await res1.json();
    expect(json1.error).toContain("documentIndex");

    const res2 = await POST(makeRequest({ sessionId: "session-123", documentIndex: 1.5 }));
    expect(res2.status).toBe(400);
    const json2 = await res2.json();
    expect(json2.error).toContain("documentIndex");
  });

  it("returns 404 when session not found (getSession returns null)", async () => {
    mockedGetSession.mockReturnValue(null);

    const res = await POST(makeRequest({ sessionId: "session-123", documentIndex: 0 }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("Session not found");
  });

  it("returns 400 when documentIndex is out of bounds", async () => {
    mockedGetSession.mockReturnValue(session);

    const res = await POST(makeRequest({ sessionId: "session-123", documentIndex: 5 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid document index");
  });

  it("returns 400 when document has empty content", async () => {
    const emptySession = {
      ...session,
      documents: [
        {
          filename: "empty.md",
          format: "md" as const,
          content: "   ",
          wordCount: 0,
          errors: [] as string[],
        },
      ],
    };
    mockedGetSession.mockReturnValue(emptySession);

    const res = await POST(makeRequest({ sessionId: "session-123", documentIndex: 0 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("no extractable content");
  });

  it("successful reclassification: calls classifyDocument, sets classification, clears user edits, returns the classification", async () => {
    const classification = {
      filename: "test.md",
      objectType: "persona" as const,
      objectName: "Test Persona",
      tags: ["tag1"],
      suggestedRelationships: [],
      confidence: 0.9,
      needsReview: false,
    };
    mockedGetSession.mockReturnValue(session);
    mockedClassify.mockResolvedValue(classification);
    mockedSetClassification.mockReturnValue(true);
    const deleteSpy = vi.spyOn(session.userEdits, "delete");

    const res = await POST(makeRequest({ sessionId: "session-123", documentIndex: 0 }));

    expect(res.status).toBe(200);
    expect(mockedListKnowledge).toHaveBeenCalled();
    expect(mockedClassify).toHaveBeenCalledWith(session.documents[0], []);
    expect(mockedSetClassification).toHaveBeenCalledWith("session-123", 0, classification);
    expect(deleteSpy).toHaveBeenCalledWith(0);

    const json = await res.json();
    expect(json).toEqual(classification);
  });
});

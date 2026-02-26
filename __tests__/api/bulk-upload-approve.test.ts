import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/upload-session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/submissions", () => ({
  createSubmission: vi.fn(),
}));

import { POST } from "@/app/api/bulk-upload/approve/route";
import { getSession } from "@/lib/upload-session";
import { createSubmission } from "@/lib/submissions";
import { NextRequest } from "next/server";

const mockedGetSession = vi.mocked(getSession);
const mockedCreateSubmission = vi.mocked(createSubmission);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/bulk-upload/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const session = {
  id: "session-123",
  documents: [
    { filename: "doc1.md", format: "md" as const, content: "Content 1", wordCount: 2, errors: [] as string[] },
    { filename: "doc2.md", format: "md" as const, content: "Content 2", wordCount: 2, errors: [] as string[] },
  ],
  classifications: new Map([
    [
      0,
      {
        filename: "doc1.md",
        objectType: "persona" as const,
        objectName: "Test Persona",
        tags: ["tag1"],
        suggestedRelationships: [],
        confidence: 0.9,
        needsReview: false,
      },
    ],
    [
      1,
      {
        filename: "doc2.md",
        objectType: "use_case" as const,
        objectName: "Test UC",
        tags: ["tag2"],
        suggestedRelationships: [],
        confidence: 0.8,
        needsReview: false,
      },
    ],
  ]),
  userEdits: new Map(),
  status: "reviewing" as const,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreateSubmission.mockResolvedValue({ id: "sub-uuid", status: "pending" });
});

describe("POST /api/bulk-upload/approve", () => {
  it("returns 400 when sessionId missing", async () => {
    const res = await POST(makeRequest({ documentIndexes: [0], submitter: "user@test.com" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("sessionId");
  });

  it("returns 400 when documentIndexes is empty or not an array", async () => {
    const res1 = await POST(makeRequest({ sessionId: "session-123", documentIndexes: [], submitter: "user@test.com" }));
    expect(res1.status).toBe(400);
    const json1 = await res1.json();
    expect(json1.error).toContain("documentIndexes");

    const res2 = await POST(makeRequest({ sessionId: "session-123", documentIndexes: "not-array", submitter: "user@test.com" }));
    expect(res2.status).toBe(400);
  });

  it("returns 400 when submitter missing", async () => {
    const res = await POST(makeRequest({ sessionId: "session-123", documentIndexes: [0] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("submitter");
  });

  it("returns 404 when session not found", async () => {
    mockedGetSession.mockReturnValue(null);

    const res = await POST(makeRequest({ sessionId: "session-123", documentIndexes: [0], submitter: "user@test.com" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("Session not found");
  });

  it("successful approval: creates one submission per document, returns submissions array", async () => {
    mockedGetSession.mockReturnValue(session);
    mockedCreateSubmission
      .mockResolvedValueOnce({ id: "sub-1", status: "pending" })
      .mockResolvedValueOnce({ id: "sub-2", status: "pending" });

    const res = await POST(makeRequest({ sessionId: "session-123", documentIndexes: [0, 1], submitter: "user@test.com" }));

    expect(res.status).toBe(201);
    expect(mockedCreateSubmission).toHaveBeenCalledTimes(2);
    expect(mockedCreateSubmission).toHaveBeenNthCalledWith(1, {
      submitter: "user@test.com",
      objectType: "persona",
      objectName: "Test Persona",
      submissionType: "new",
      proposedContent: JSON.stringify({
        name: "Test Persona",
        content: "Content 1",
        tags: ["tag1"],
      }),
    });
    expect(mockedCreateSubmission).toHaveBeenNthCalledWith(2, {
      submitter: "user@test.com",
      objectType: "use_case",
      objectName: "Test UC",
      submissionType: "new",
      proposedContent: JSON.stringify({
        name: "Test UC",
        content: "Content 2",
        tags: ["tag2"],
      }),
    });

    const json = await res.json();
    expect(json.submissions).toHaveLength(2);
    expect(json.submissions[0]).toEqual({ documentIndex: 0, submissionId: "sub-1" });
    expect(json.submissions[1]).toEqual({ documentIndex: 1, submissionId: "sub-2" });
    expect(json.errors).toHaveLength(0);
  });

  it("handles partial failures: if createSubmission throws for one document, continues with others, returns both submissions and errors", async () => {
    mockedGetSession.mockReturnValue(session);
    mockedCreateSubmission
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce({ id: "sub-2", status: "pending" });

    const res = await POST(makeRequest({ sessionId: "session-123", documentIndexes: [0, 1], submitter: "user@test.com" }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.submissions).toHaveLength(1);
    expect(json.submissions[0]).toEqual({ documentIndex: 1, submissionId: "sub-2" });
    expect(json.errors).toHaveLength(1);
    expect(json.errors[0]).toMatchObject({ documentIndex: 0, error: "DB error" });
  });

  it("applies user overrides when provided", async () => {
    mockedGetSession.mockReturnValue(session);

    const res = await POST(
      makeRequest({
        sessionId: "session-123",
        documentIndexes: [0],
        submitter: "user@test.com",
        overrides: {
          "0": { objectName: "Overridden Name", tags: ["override-tag"] },
        },
      })
    );

    expect(res.status).toBe(201);
    expect(mockedCreateSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: "Overridden Name",
        proposedContent: JSON.stringify({
          name: "Overridden Name",
          content: "Content 1",
          tags: ["override-tag"],
        }),
      })
    );
  });

  it("returns error for document with no classification", async () => {
    const sessionNoClass = {
      ...session,
      documents: [
        { filename: "doc1.md", format: "md" as const, content: "Content 1", wordCount: 2, errors: [] as string[] },
        { filename: "doc2.md", format: "md" as const, content: "Content 2", wordCount: 2, errors: [] as string[] },
      ],
      classifications: new Map([
        [
          1,
          {
            filename: "doc2.md",
            objectType: "use_case" as const,
            objectName: "Test UC",
            tags: ["tag2"],
            suggestedRelationships: [],
            confidence: 0.8,
            needsReview: false,
          },
        ],
      ]),
    };
    mockedGetSession.mockReturnValue(sessionNoClass);

    const res = await POST(makeRequest({ sessionId: "session-123", documentIndexes: [0, 1], submitter: "user@test.com" }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.submissions).toHaveLength(1);
    expect(json.submissions[0]).toEqual({ documentIndex: 1, submissionId: "sub-uuid" });
    expect(json.errors).toHaveLength(1);
    expect(json.errors[0]).toMatchObject({ documentIndex: 0, error: "No classification for document" });
  });
});

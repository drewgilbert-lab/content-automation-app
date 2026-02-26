import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/document-parser", () => ({
  parseDocuments: vi.fn(),
}));

vi.mock("@/lib/upload-session", () => ({
  createSession: vi.fn(),
  updateSessionStatus: vi.fn(),
}));

import { POST } from "@/app/api/bulk-upload/parse/route";
import { parseDocuments } from "@/lib/document-parser";
import { createSession, updateSessionStatus } from "@/lib/upload-session";
import { NextRequest } from "next/server";

const mockedParseDocuments = vi.mocked(parseDocuments);
const mockedCreateSession = vi.mocked(createSession);
const mockedUpdateSessionStatus = vi.mocked(updateSessionStatus);

function makeFormDataRequest(files: File[]): NextRequest {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  return new NextRequest("http://localhost:3000/api/bulk-upload/parse", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/bulk-upload/parse", () => {
  it("returns 400 when no files provided (empty FormData)", async () => {
    const req = makeFormDataRequest([]);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No files provided");
  });

  it("returns 400 when batch exceeds 50 files limit", async () => {
    const files = Array.from({ length: 51 }, (_, i) => new File(["x"], `doc${i}.md`, { type: "text/markdown" }));
    const req = makeFormDataRequest(files);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("51");
    expect(json.error).toContain("50");
    expect(mockedParseDocuments).not.toHaveBeenCalled();
  });

  it("calls parseDocuments with the files, creates a session, returns sessionId and documents", async () => {
    const docs = [
      { filename: "test.md", format: "md" as const, content: "hello", wordCount: 1, errors: [] },
    ];
    mockedParseDocuments.mockResolvedValue({ documents: docs, errors: [] });
    mockedCreateSession.mockReturnValue({
      id: "session-123",
      documents: docs,
      classifications: new Map(),
      userEdits: new Map(),
      status: "parsing",
      createdAt: new Date(),
      expiresAt: new Date(),
    });

    const file = new File(["hello"], "test.md", { type: "text/markdown" });
    const req = makeFormDataRequest([file]);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockedParseDocuments).toHaveBeenCalledTimes(1);
    const passedFiles = mockedParseDocuments.mock.calls[0][0];
    expect(passedFiles).toHaveLength(1);
    expect(passedFiles[0].name).toBe("test.md");
    expect(mockedCreateSession).toHaveBeenCalledWith(docs);
    expect(mockedUpdateSessionStatus).toHaveBeenCalledWith("session-123", "reviewing");

    const json = await res.json();
    expect(json.sessionId).toBe("session-123");
    expect(json.documents).toHaveLength(1);
    expect(json.documents[0]).toMatchObject({
      index: 0,
      filename: "test.md",
      format: "md",
      wordCount: 1,
      parseErrors: [],
    });
    expect(json.errors).toEqual([]);
  });

  it("returns parse errors alongside documents", async () => {
    const docs = [
      { filename: "ok.md", format: "md" as const, content: "ok", wordCount: 1, errors: [] },
    ];
    const parseErrors = [{ filename: "bad.pdf", error: "Unsupported format" }];
    mockedParseDocuments.mockResolvedValue({ documents: docs, errors: parseErrors });
    mockedCreateSession.mockReturnValue({
      id: "session-456",
      documents: docs,
      classifications: new Map(),
      userEdits: new Map(),
      status: "parsing",
      createdAt: new Date(),
      expiresAt: new Date(),
    });

    const file = new File(["ok"], "ok.md", { type: "text/markdown" });
    const req = makeFormDataRequest([file]);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.documents).toHaveLength(1);
    expect(json.errors).toEqual(parseErrors);
  });

  it("returns 400 when FormData is invalid (send JSON body instead)", async () => {
    const req = new NextRequest("http://localhost:3000/api/bulk-upload/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid form data");
  });
});

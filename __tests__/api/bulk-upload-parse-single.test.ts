import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/document-parser", () => ({
  parseDocument: vi.fn(),
}));

vi.mock("@/lib/upload-session", () => ({
  getSession: vi.fn(),
  addDocumentToSession: vi.fn(),
}));

import { POST } from "@/app/api/bulk-upload/parse-single/route";
import { requireRole } from "@/lib/auth-server";
import { parseDocument } from "@/lib/document-parser";
import { getSession, addDocumentToSession } from "@/lib/upload-session";

const mockedRequireRole = vi.mocked(requireRole);
const mockedParseDocument = vi.mocked(parseDocument);
const mockedGetSession = vi.mocked(getSession);
const mockedAddDocument = vi.mocked(addDocumentToSession);

function makeRequest(fields: { file?: File; sessionId?: string }): NextRequest {
  const formData = new FormData();
  if (fields.file) formData.append("file", fields.file);
  if (fields.sessionId !== undefined) formData.append("sessionId", fields.sessionId);
  return new NextRequest("http://localhost:3000/api/bulk-upload/parse-single", {
    method: "POST",
    body: formData,
  });
}

const authUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test",
  avatarUrl: "",
  role: "contributor" as const,
  permissionSetId: "",
  active: true,
  lastLoginAt: "",
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireRole.mockResolvedValue(authUser);
});

describe("POST /api/bulk-upload/parse-single", () => {
  it("parses a file and appends it to the session", async () => {
    const file = new File(["hello world"], "test.md", { type: "text/markdown" });
    mockedGetSession.mockResolvedValue({
      id: "session-1",
      documents: [],
      classifications: new Map(),
      userEdits: new Map(),
      status: "parsing",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockedParseDocument.mockResolvedValue({
      filename: "test.md",
      format: "md",
      content: "hello world",
      wordCount: 2,
      errors: [],
    });
    mockedAddDocument.mockResolvedValue({ index: 0 });

    const res = await POST(makeRequest({ file, sessionId: "session-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      sessionId: "session-1",
      index: 0,
      filename: "test.md",
      format: "md",
      content: "hello world",
      wordCount: 2,
      parseErrors: [],
    });
    expect(mockedAddDocument).toHaveBeenCalled();
  });

  it("returns 400 when file is missing", async () => {
    const res = await POST(makeRequest({ sessionId: "session-1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("file is required");
  });

  it("returns 400 when sessionId is missing", async () => {
    const file = new File(["x"], "test.md", { type: "text/markdown" });
    const res = await POST(makeRequest({ file }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("sessionId");
  });

  it("returns 404 when session does not exist", async () => {
    const file = new File(["x"], "test.md", { type: "text/markdown" });
    mockedGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ file, sessionId: "missing" }));
    expect(res.status).toBe(404);
    expect(mockedParseDocument).not.toHaveBeenCalled();
  });

  it("returns 400 when file exceeds size limit", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024)], "big.txt", {
      type: "text/plain",
    });
    mockedGetSession.mockResolvedValue({
      id: "session-1",
      documents: [],
      classifications: new Map(),
      userEdits: new Map(),
      status: "parsing",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    });
    const res = await POST(makeRequest({ file: big, sessionId: "session-1" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("4 MB");
    expect(mockedParseDocument).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/upload-session", () => ({
  createSession: vi.fn(),
  getSerializedSession: vi.fn(),
}));

import { POST } from "@/app/api/bulk-upload/session/route";
import { GET } from "@/app/api/bulk-upload/session/[sessionId]/route";
import { requireRole } from "@/lib/auth-server";
import { createSession, getSerializedSession } from "@/lib/upload-session";

const mockedRequireRole = vi.mocked(requireRole);
const mockedCreateSession = vi.mocked(createSession);
const mockedGetSerializedSession = vi.mocked(getSerializedSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireRole.mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
    name: "Test",
    avatarUrl: "",
    role: "contributor",
    permissionSetId: "",
    active: true,
    lastLoginAt: "",
    createdAt: "",
    updatedAt: "",
  });
});

describe("POST /api/bulk-upload/session", () => {
  it("creates an empty session and returns sessionId", async () => {
    mockedCreateSession.mockResolvedValue({
      id: "session-new",
      documents: [],
      classifications: new Map(),
      userEdits: new Map(),
      status: "parsing",
      createdAt: new Date(),
      expiresAt: new Date(),
    });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockedCreateSession).toHaveBeenCalledWith([]);
    const json = await res.json();
    expect(json.sessionId).toBe("session-new");
  });

  it("returns 401 when unauthenticated", async () => {
    mockedRequireRole.mockResolvedValue(
      Response.json({ error: "Authentication required" }, { status: 401 })
    );
    const res = await POST();
    expect(res.status).toBe(401);
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });
});

describe("GET /api/bulk-upload/session/[sessionId]", () => {
  it("returns 404 when session not found", async () => {
    mockedGetSerializedSession.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/bulk-upload/session/session-123"),
      { params: Promise.resolve({ sessionId: "session-123" }) }
    );

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toContain("Session not found");
  });

  it("returns session state when found", async () => {
    const state = {
      id: "session-123",
      documents: [
        {
          index: 0,
          filename: "test.md",
          format: "md",
          content: "hello",
          wordCount: 1,
          parseErrors: [],
        },
      ],
      classifications: [],
      userEdits: [],
      status: "reviewing" as const,
      createdAt: "2025-01-01T00:00:00.000Z",
      expiresAt: "2025-01-02T00:00:00.000Z",
    };
    mockedGetSerializedSession.mockResolvedValue(state);

    const response = await GET(
      new Request("http://localhost:3000/api/bulk-upload/session/session-123"),
      { params: Promise.resolve({ sessionId: "session-123" }) }
    );

    expect(response.status).toBe(200);
    expect(mockedGetSerializedSession).toHaveBeenCalledWith("session-123");
    const json = await response.json();
    expect(json).toEqual(state);
  });
});

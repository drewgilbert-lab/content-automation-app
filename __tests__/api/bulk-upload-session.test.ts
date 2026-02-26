import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/upload-session", () => ({
  getSerializedSession: vi.fn(),
}));

import { GET } from "@/app/api/bulk-upload/session/[sessionId]/route";
import { getSerializedSession } from "@/lib/upload-session";

const mockedGetSerializedSession = vi.mocked(getSerializedSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/bulk-upload/session/[sessionId]", () => {
  it("returns 404 when session not found (getSerializedSession returns null)", async () => {
    mockedGetSerializedSession.mockReturnValue(null);

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
    mockedGetSerializedSession.mockReturnValue(state);

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

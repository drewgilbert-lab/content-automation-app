import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/content", () => ({
  resetToDraft: vi.fn(),
  ContentStatusError: class ContentStatusError extends Error {
    constructor(currentStatus: string, attemptedAction: string) {
      super(
        `Cannot ${attemptedAction} content with status "${currentStatus}"`
      );
      this.name = "ContentStatusError";
    }
  },
}));

import { POST } from "@/app/api/content/[id]/reset/route";
import { requireRole } from "@/lib/auth-server";
import { resetToDraft, ContentStatusError } from "@/lib/content";

const mockedRequireRole = vi.mocked(requireRole);
const mockedResetToDraft = vi.mocked(resetToDraft);

const mockUser = { email: "test@test.com", role: "contributor", active: true };
const routeParams = { params: Promise.resolve({ id: "content-1" }) };

describe("content reset route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/content/[id]/reset", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/reset",
        { method: "POST" }
      );
      const res = await POST(req, routeParams);

      expect(res.status).toBe(401);
    });

    it("returns 200 with reset: true on success", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedResetToDraft.mockResolvedValue(undefined);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/reset",
        { method: "POST" }
      );
      const res = await POST(req, routeParams);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reset).toBe(true);
      expect(mockedResetToDraft).toHaveBeenCalledWith(
        "content-1",
        "test@test.com"
      );
    });

    it("returns 409 when ContentStatusError thrown", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedResetToDraft.mockRejectedValue(
        new ContentStatusError("draft", "reset to draft")
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/reset",
        { method: "POST" }
      );
      const res = await POST(req, routeParams);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Cannot reset to draft");
    });

    it("returns 404 when content not found", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedResetToDraft.mockRejectedValue(new Error("Content not found"));

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/reset",
        { method: "POST" }
      );
      const res = await POST(req, routeParams);

      expect(res.status).toBe(404);
    });
  });
});

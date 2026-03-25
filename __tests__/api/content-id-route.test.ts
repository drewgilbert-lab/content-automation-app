import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/content", () => ({
  getContent: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
  ContentStatusError: class ContentStatusError extends Error {
    constructor(currentStatus: string, attemptedAction: string) {
      super(
        `Cannot ${attemptedAction} content with status "${currentStatus}"`
      );
      this.name = "ContentStatusError";
    }
  },
}));

import { GET, PUT, DELETE } from "@/app/api/content/[id]/route";
import { requireRole } from "@/lib/auth-server";
import {
  getContent,
  updateContent,
  deleteContent,
  ContentStatusError,
} from "@/lib/content";

const mockedRequireRole = vi.mocked(requireRole);
const mockedGetContent = vi.mocked(getContent);
const mockedUpdateContent = vi.mocked(updateContent);
const mockedDeleteContent = vi.mocked(deleteContent);

const mockUser = { email: "test@test.com", role: "editor", active: true };
const routeParams = { params: Promise.resolve({ id: "content-1" }) };

describe("content [id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/content/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1"
      );
      const res = await GET(req, routeParams);

      expect(res.status).toBe(401);
    });

    it("returns content detail on success", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedGetContent.mockResolvedValue({
        id: "content-1",
        title: "Test",
        status: "draft",
      } as any);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1"
      );
      const res = await GET(req, routeParams);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("content-1");
      expect(json.title).toBe("Test");
    });

    it("returns 404 when content not found", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedGetContent.mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1"
      );
      const res = await GET(req, routeParams);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Content not found");
    });
  });

  describe("PUT /api/content/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1",
        {
          method: "PUT",
          body: JSON.stringify({ title: "Updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await PUT(req, routeParams);

      expect(res.status).toBe(401);
    });

    it("updates and returns content detail", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedUpdateContent.mockResolvedValue(undefined);
      mockedGetContent.mockResolvedValue({
        id: "content-1",
        title: "Updated Title",
        status: "draft",
      } as any);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1",
        {
          method: "PUT",
          body: JSON.stringify({ title: "Updated Title" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await PUT(req, routeParams);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe("Updated Title");
      expect(mockedUpdateContent).toHaveBeenCalledWith(
        "content-1",
        expect.objectContaining({
          title: "Updated Title",
          updatedBy: "test@test.com",
        })
      );
    });

    it("returns 409 when ContentStatusError thrown", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedUpdateContent.mockRejectedValue(
        new ContentStatusError("submitted", "update")
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1",
        {
          method: "PUT",
          body: JSON.stringify({ title: "Updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await PUT(req, routeParams);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Cannot update content");
    });

    it("returns 404 when content not found after update", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedUpdateContent.mockResolvedValue(undefined);
      mockedGetContent.mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1",
        {
          method: "PUT",
          body: JSON.stringify({ title: "Updated" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await PUT(req, routeParams);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Content not found");
    });
  });

  describe("DELETE /api/content/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1",
        { method: "DELETE" }
      );
      const res = await DELETE(req, routeParams);

      expect(res.status).toBe(401);
    });

    it("returns deleted true on success", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedDeleteContent.mockResolvedValue(true);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1",
        { method: "DELETE" }
      );
      const res = await DELETE(req, routeParams);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);
    });

    it("returns 404 when content not found", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedDeleteContent.mockResolvedValue(false);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1",
        { method: "DELETE" }
      );
      const res = await DELETE(req, routeParams);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Content not found");
    });

    it("returns 409 when ContentStatusError thrown", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedDeleteContent.mockRejectedValue(
        new ContentStatusError("published", "delete")
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1",
        { method: "DELETE" }
      );
      const res = await DELETE(req, routeParams);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Cannot delete content");
    });
  });
});

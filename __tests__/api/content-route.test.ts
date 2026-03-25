import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/content", () => ({
  listContent: vi.fn(),
  createContent: vi.fn(),
  VALID_CONTENT_STATUSES: [
    "draft",
    "submitted",
    "in_review",
    "approved",
    "rejected",
    "published",
  ],
  VALID_CONTENT_SOURCE_CHANNELS: [
    "generate_ui",
    "direct_upload",
    "mcp",
    "api",
    "bulk_import",
  ],
  ContentStatusError: class ContentStatusError extends Error {
    constructor(currentStatus: string, attemptedAction: string) {
      super(
        `Cannot ${attemptedAction} content with status "${currentStatus}"`
      );
      this.name = "ContentStatusError";
    }
  },
}));

vi.mock("@/lib/skill-types", () => ({
  isValidContentType: vi.fn(
    (type: string) =>
      [
        "email",
        "blog",
        "social",
        "thought_leadership",
        "internal_doc",
        "content_narrative",
        "pillar_research",
        "competitor_functionality_brief",
        "competitor_persona_messaging_brief",
        "market_content_brief",
      ].includes(type)
  ),
}));

import { GET, POST } from "@/app/api/content/route";
import { requireRole } from "@/lib/auth-server";
import { listContent, createContent } from "@/lib/content";

const mockedRequireRole = vi.mocked(requireRole);
const mockedListContent = vi.mocked(listContent);
const mockedCreateContent = vi.mocked(createContent);

const mockUser = { email: "test@test.com", role: "contributor", active: true };

describe("content route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/content", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost:3000/api/content");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns 200 with content list", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedListContent.mockResolvedValue([
        { id: "c1", title: "Test Content" },
      ] as any);

      const req = new NextRequest("http://localhost:3000/api/content");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.content).toHaveLength(1);
      expect(json.content[0].id).toBe("c1");
    });

    it("rejects invalid contentType with 400", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);

      const req = new NextRequest(
        "http://localhost:3000/api/content?contentType=invalid_type"
      );
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid contentType");
    });

    it("rejects invalid status with 400", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);

      const req = new NextRequest(
        "http://localhost:3000/api/content?status=bad_status"
      );
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid status");
    });

    it("rejects invalid sourceChannel with 400", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);

      const req = new NextRequest(
        "http://localhost:3000/api/content?sourceChannel=bad_channel"
      );
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid sourceChannel");
    });

    it("passes valid filters to listContent", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedListContent.mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost:3000/api/content?contentType=email&status=draft&sourceChannel=api&tags=a,b&search=hello&limit=10&offset=5&createdBy=user@test.com"
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(mockedListContent).toHaveBeenCalledWith({
        contentType: "email",
        status: "draft",
        sourceChannel: "api",
        tags: ["a", "b"],
        search: "hello",
        limit: 10,
        offset: 5,
        createdBy: "user@test.com",
      });
    });
  });

  describe("POST /api/content", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest("http://localhost:3000/api/content", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          contentType: "email",
          body: "content",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when required fields missing", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);

      const req = new NextRequest("http://localhost:3000/api/content", {
        method: "POST",
        body: JSON.stringify({ title: "Test" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("title, contentType, and body are required");
    });

    it("returns 400 when contentType is invalid", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);

      const req = new NextRequest("http://localhost:3000/api/content", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          contentType: "invalid_type",
          body: "content body",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid contentType");
    });

    it("returns 201 on successful creation", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedCreateContent.mockResolvedValue("new-content-1");

      const req = new NextRequest("http://localhost:3000/api/content", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Content",
          contentType: "email",
          body: "This is the content body",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe("new-content-1");
    });

    it("sets createdBy from auth user email", async () => {
      mockedRequireRole.mockResolvedValue(mockUser as any);
      mockedCreateContent.mockResolvedValue("new-content-2");

      const req = new NextRequest("http://localhost:3000/api/content", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Content",
          contentType: "blog",
          body: "Blog body",
        }),
        headers: { "Content-Type": "application/json" },
      });
      await POST(req);

      expect(mockedCreateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: "test@test.com",
        })
      );
    });
  });
});

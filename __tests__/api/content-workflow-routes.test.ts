import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/content", () => ({
  submitForReview: vi.fn(),
  beginReview: vi.fn(),
  approveContent: vi.fn(),
  rejectContent: vi.fn(),
  publishContent: vi.fn(),
  ContentStatusError: class ContentStatusError extends Error {
    constructor(currentStatus: string, attemptedAction: string) {
      super(
        `Cannot ${attemptedAction} content with status "${currentStatus}"`
      );
      this.name = "ContentStatusError";
    }
  },
}));

import { POST as submitPOST } from "@/app/api/content/[id]/submit/route";
import { POST as reviewPOST } from "@/app/api/content/[id]/review/route";
import { POST as publishPOST } from "@/app/api/content/[id]/publish/route";
import { requireRole } from "@/lib/auth-server";
import {
  submitForReview,
  beginReview,
  approveContent,
  rejectContent,
  publishContent,
  ContentStatusError,
} from "@/lib/content";

const mockedRequireRole = vi.mocked(requireRole);
const mockedSubmitForReview = vi.mocked(submitForReview);
const mockedBeginReview = vi.mocked(beginReview);
const mockedApproveContent = vi.mocked(approveContent);
const mockedRejectContent = vi.mocked(rejectContent);
const mockedPublishContent = vi.mocked(publishContent);

const mockContributor = {
  email: "test@test.com",
  role: "contributor",
  active: true,
};
const mockEditor = { email: "editor@test.com", role: "editor", active: true };
const mockAdmin = { email: "admin@test.com", role: "admin", active: true };
const routeParams = { params: Promise.resolve({ id: "content-1" }) };

describe("content workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/content/[id]/submit", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/submit",
        { method: "POST" }
      );
      const res = await submitPOST(req, routeParams);

      expect(res.status).toBe(401);
    });

    it("returns id and submitted status on success", async () => {
      mockedRequireRole.mockResolvedValue(mockContributor as any);
      mockedSubmitForReview.mockResolvedValue(undefined);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/submit",
        { method: "POST" }
      );
      const res = await submitPOST(req, routeParams);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("content-1");
      expect(json.status).toBe("submitted");
      expect(mockedSubmitForReview).toHaveBeenCalledWith(
        "content-1",
        "test@test.com"
      );
    });

    it("returns 409 when ContentStatusError thrown", async () => {
      mockedRequireRole.mockResolvedValue(mockContributor as any);
      mockedSubmitForReview.mockRejectedValue(
        new ContentStatusError("published", "submit")
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/submit",
        { method: "POST" }
      );
      const res = await submitPOST(req, routeParams);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Cannot submit content");
    });
  });

  describe("POST /api/content/[id]/review", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/review",
        {
          method: "POST",
          body: JSON.stringify({ action: "approve" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await reviewPOST(req, routeParams);

      expect(res.status).toBe(401);
    });

    it("returns 400 when action is missing or invalid", async () => {
      mockedRequireRole.mockResolvedValue(mockEditor as any);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/review",
        {
          method: "POST",
          body: JSON.stringify({ action: "invalid" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await reviewPOST(req, routeParams);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('action must be "approve" or "reject"');
    });

    it("returns 400 when action is reject but comment is missing", async () => {
      mockedRequireRole.mockResolvedValue(mockEditor as any);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/review",
        {
          method: "POST",
          body: JSON.stringify({ action: "reject" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await reviewPOST(req, routeParams);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain(
        "comment is required when rejecting content"
      );
    });

    it("returns approved status on approve", async () => {
      mockedRequireRole.mockResolvedValue(mockEditor as any);
      mockedBeginReview.mockResolvedValue(undefined);
      mockedApproveContent.mockResolvedValue(undefined);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/review",
        {
          method: "POST",
          body: JSON.stringify({ action: "approve" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await reviewPOST(req, routeParams);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("content-1");
      expect(json.status).toBe("approved");
      expect(mockedBeginReview).toHaveBeenCalledWith(
        "content-1",
        "editor@test.com"
      );
      expect(mockedApproveContent).toHaveBeenCalledWith(
        "content-1",
        "editor@test.com",
        undefined
      );
    });

    it("returns draft status on reject with comment", async () => {
      mockedRequireRole.mockResolvedValue(mockEditor as any);
      mockedBeginReview.mockResolvedValue(undefined);
      mockedRejectContent.mockResolvedValue(undefined);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/review",
        {
          method: "POST",
          body: JSON.stringify({ action: "reject", comment: "needs work" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await reviewPOST(req, routeParams);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("content-1");
      expect(json.status).toBe("draft");
      expect(mockedRejectContent).toHaveBeenCalledWith(
        "content-1",
        "editor@test.com",
        "needs work"
      );
    });

    it("returns 409 when ContentStatusError thrown", async () => {
      mockedRequireRole.mockResolvedValue(mockEditor as any);
      mockedBeginReview.mockRejectedValue(
        new ContentStatusError("draft", "review")
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/review",
        {
          method: "POST",
          body: JSON.stringify({ action: "approve" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const res = await reviewPOST(req, routeParams);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Cannot review content");
    });
  });

  describe("POST /api/content/[id]/publish", () => {
    it("returns 401 when not authenticated", async () => {
      mockedRequireRole.mockResolvedValue(
        Response.json({ error: "Unauthorized" }, { status: 401 })
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/publish",
        { method: "POST" }
      );
      const res = await publishPOST(req, routeParams);

      expect(res.status).toBe(401);
    });

    it("returns published status on success", async () => {
      mockedRequireRole.mockResolvedValue(mockAdmin as any);
      mockedPublishContent.mockResolvedValue(undefined);

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/publish",
        { method: "POST" }
      );
      const res = await publishPOST(req, routeParams);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("content-1");
      expect(json.status).toBe("published");
      expect(mockedPublishContent).toHaveBeenCalledWith(
        "content-1",
        "admin@test.com"
      );
    });

    it("returns 409 when ContentStatusError thrown", async () => {
      mockedRequireRole.mockResolvedValue(mockAdmin as any);
      mockedPublishContent.mockRejectedValue(
        new ContentStatusError("draft", "publish")
      );

      const req = new NextRequest(
        "http://localhost:3000/api/content/content-1/publish",
        { method: "POST" }
      );
      const res = await publishPOST(req, routeParams);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Cannot publish content");
    });
  });
});

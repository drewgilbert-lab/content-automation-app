import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/submissions", () => ({
  createSubmission: vi.fn(),
  listSubmissions: vi.fn(),
  VALID_SUBMISSION_TYPES: ["new", "update", "document_add"],
  VALID_STATUSES: ["pending", "accepted", "rejected", "deferred"],
  VALID_OBJECT_TYPES: [
    "persona",
    "segment",
    "use_case",
    "business_rule",
    "icp",
    "competitor",
    "customer_evidence",
    "skill",
  ],
}));

import { POST } from "@/app/api/submissions/route";
import { createSubmission } from "@/lib/submissions";

const mockedCreateSubmission = vi.mocked(createSubmission);

describe("submissions route - skill type", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts objectType: skill", async () => {
    mockedCreateSubmission.mockResolvedValue({ id: "sub-1", status: "pending" });

    const req = new NextRequest("http://localhost:3000/api/submissions", {
      method: "POST",
      body: JSON.stringify({
        submitter: "system",
        objectType: "skill",
        objectName: "Test Skill",
        submissionType: "update",
        proposedContent: JSON.stringify({ content: "new content" }),
        targetObjectId: "skill-123",
        sourceChannel: "system",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockedCreateSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        objectType: "skill",
        sourceChannel: "system",
      })
    );
  });

  it("rejects invalid objectType", async () => {
    const req = new NextRequest("http://localhost:3000/api/submissions", {
      method: "POST",
      body: JSON.stringify({
        submitter: "admin",
        objectType: "invalid_type",
        objectName: "Test",
        submissionType: "new",
        proposedContent: "{}",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid objectType");
  });

  it("accepts sourceChannel: system", async () => {
    mockedCreateSubmission.mockResolvedValue({ id: "sub-2", status: "pending" });

    const req = new NextRequest("http://localhost:3000/api/submissions", {
      method: "POST",
      body: JSON.stringify({
        submitter: "system",
        objectType: "persona",
        objectName: "Test Persona",
        submissionType: "new",
        proposedContent: JSON.stringify({ name: "Test", content: "..." }),
        sourceChannel: "system",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

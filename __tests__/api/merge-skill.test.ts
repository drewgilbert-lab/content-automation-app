import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/submissions", () => ({
  getSubmission: vi.fn(),
}));

vi.mock("@/lib/knowledge", () => ({
  getKnowledgeObject: vi.fn(),
}));

vi.mock("@/lib/skills", () => ({
  getSkill: vi.fn(),
}));

vi.mock("@/lib/merge", () => ({
  buildMergePrompt: vi.fn().mockReturnValue({ systemPrompt: "s", userMessage: "u" }),
  buildDocumentAdditionPrompt: vi.fn().mockReturnValue({ systemPrompt: "s", userMessage: "u" }),
  buildSkillRefreshPrompt: vi.fn().mockReturnValue({ systemPrompt: "skill-sys", userMessage: "skill-user" }),
}));

vi.mock("@/lib/claude", () => ({
  streamMessage: vi.fn().mockResolvedValue(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("merged content"));
        controller.close();
      },
    })
  ),
}));

import { POST } from "@/app/api/submissions/[id]/merge/route";
import { getSubmission } from "@/lib/submissions";
import { getSkill } from "@/lib/skills";
import { getKnowledgeObject } from "@/lib/knowledge";
import { buildSkillRefreshPrompt, buildMergePrompt } from "@/lib/merge";

const mockedGetSubmission = vi.mocked(getSubmission);
const mockedGetSkill = vi.mocked(getSkill);
const mockedGetKnowledgeObject = vi.mocked(getKnowledgeObject);
const mockedBuildSkillRefreshPrompt = vi.mocked(buildSkillRefreshPrompt);
const mockedBuildMergePrompt = vi.mocked(buildMergePrompt);

describe("merge route - skill submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses buildSkillRefreshPrompt for skill submissions", async () => {
    mockedGetSubmission.mockResolvedValue({
      id: "sub-1",
      submitter: "system",
      objectType: "skill",
      objectName: "Test Skill",
      submissionType: "update",
      proposedContent: JSON.stringify({
        content: "updated object content",
        integrationPrompt: "update job titles",
      }),
      targetObjectId: "skill-1",
      status: "pending",
      createdAt: "2026-01-01T00:00:00Z",
      sourceChannel: "system",
    } as any);

    mockedGetSkill.mockResolvedValue({
      id: "skill-1",
      content: "current skill content",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/submissions/sub-1/merge", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "sub-1" }) });
    expect(res.status).toBe(200);
    expect(mockedBuildSkillRefreshPrompt).toHaveBeenCalledWith(
      "current skill content",
      "updated object content",
      "update job titles"
    );
    expect(mockedGetKnowledgeObject).not.toHaveBeenCalled();
  });

  it("uses buildMergePrompt for knowledge submissions", async () => {
    mockedGetSubmission.mockResolvedValue({
      id: "sub-2",
      submitter: "admin",
      objectType: "persona",
      objectName: "Sales",
      submissionType: "update",
      proposedContent: JSON.stringify({ content: "proposed" }),
      targetObjectId: "obj-1",
      status: "pending",
      createdAt: "2026-01-01T00:00:00Z",
    } as any);

    mockedGetKnowledgeObject.mockResolvedValue({
      id: "obj-1",
      content: "current content",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/submissions/sub-2/merge", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "sub-2" }) });
    expect(res.status).toBe(200);
    expect(mockedBuildMergePrompt).toHaveBeenCalled();
    expect(mockedGetSkill).not.toHaveBeenCalled();
  });

  it("returns 404 when target skill not found", async () => {
    mockedGetSubmission.mockResolvedValue({
      id: "sub-3",
      objectType: "skill",
      submissionType: "update",
      proposedContent: "{}",
      targetObjectId: "missing-skill",
      status: "pending",
    } as any);

    mockedGetSkill.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/submissions/sub-3/merge", {
      method: "POST",
    });

    const res = await POST(req, { params: Promise.resolve({ id: "sub-3" }) });
    expect(res.status).toBe(404);
  });
});

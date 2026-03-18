import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/content-workflow-store", () => ({
  createWorkflowRun: vi.fn(),
  getWorkflowSnapshot: vi.fn(),
  cancelRun: vi.fn(),
}));

vi.mock("@/lib/content-workflow-artifacts", () => ({
  listArtifactsByRun: vi.fn(),
}));

import { POST as createRun } from "@/app/api/content-workflow/runs/route";
import { GET as getRun } from "@/app/api/content-workflow/runs/[id]/route";
import { GET as getRunStatus } from "@/app/api/content-workflow/runs/[id]/status/route";
import { POST as cancelRunRoute } from "@/app/api/content-workflow/runs/[id]/cancel/route";
import {
  cancelRun,
  createWorkflowRun,
  getWorkflowSnapshot,
} from "@/lib/content-workflow-store";
import { listArtifactsByRun } from "@/lib/content-workflow-artifacts";
import type {
  PillarResearchBranch,
  PillarResearchRun,
  PillarResearchStep,
} from "@/lib/content-workflow-types";

const mockedCreateWorkflowRun = vi.mocked(createWorkflowRun);
const mockedGetWorkflowSnapshot = vi.mocked(getWorkflowSnapshot);
const mockedCancelRun = vi.mocked(cancelRun);
const mockedListArtifactsByRun = vi.mocked(listArtifactsByRun);

const run: PillarResearchRun = {
  id: "run-1",
  status: "created",
  inputType: "use_case",
  inputValue: "test",
  createdBy: "tester",
  startedAt: "2026-03-17T00:00:00.000Z",
  idempotencyKey: "idempotent-1",
};

const branches: PillarResearchBranch[] = [
  {
    id: "b1",
    runId: "run-1",
    branchType: "market_research",
    status: "pending",
    attemptCount: 0,
    startedAt: "2026-03-17T00:00:00.000Z",
  },
];

const snapshot: {
  run: PillarResearchRun;
  branches: PillarResearchBranch[];
  steps: PillarResearchStep[];
} = {
  run,
  branches,
  steps: [],
};

describe("content workflow run routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateWorkflowRun.mockResolvedValue({
      run: snapshot.run,
      deduped: false,
    });
    mockedGetWorkflowSnapshot.mockResolvedValue(snapshot);
    mockedCancelRun.mockResolvedValue({ ...snapshot.run, status: "cancelled" });
    mockedListArtifactsByRun.mockResolvedValue([]);
  });

  it("creates a run from valid request", async () => {
    const req = new NextRequest("http://localhost:3000/api/content-workflow/runs", {
      method: "POST",
      body: JSON.stringify({
        inputType: "use_case",
        inputValue: "message strategy",
        createdBy: "tester",
        idempotencyKey: "abc",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createRun(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.run.id).toBe("run-1");
    expect(mockedCreateWorkflowRun).toHaveBeenCalled();
  });

  it("rejects invalid input type", async () => {
    const req = new NextRequest("http://localhost:3000/api/content-workflow/runs", {
      method: "POST",
      body: JSON.stringify({
        inputType: "invalid",
        inputValue: "x",
        createdBy: "tester",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createRun(req);
    expect(res.status).toBe(400);
  });

  it("gets run detail with artifacts", async () => {
    const req = new NextRequest("http://localhost:3000/api/content-workflow/runs/run-1");
    const res = await getRun(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.run.id).toBe("run-1");
    expect(Array.isArray(json.artifacts)).toBe(true);
  });

  it("gets run status summary", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/status"
    );
    const res = await getRunStatus(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.runId).toBe("run-1");
    expect(json.branchCount).toBe(1);
  });

  it("cancels run", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/cancel",
      { method: "POST" }
    );
    const res = await cancelRunRoute(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cancelled");
  });
});

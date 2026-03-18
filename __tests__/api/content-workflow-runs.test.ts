import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/content-workflow-store", () => ({
  createWorkflowRun: vi.fn(),
  getWorkflowSnapshot: vi.fn(),
  cancelRun: vi.fn(),
  getWorkflowRun: vi.fn(),
}));

vi.mock("@/lib/content-workflow-artifacts", () => ({
  listArtifactsByRun: vi.fn(),
}));

vi.mock("@/lib/content-workflow-orchestrator", () => ({
  startRunOrchestration: vi.fn(),
  retryRunTarget: vi.fn(),
}));

vi.mock("@/lib/content-workflow-events", () => ({
  listWorkflowEvents: vi.fn(),
}));

import { POST as createRun } from "@/app/api/content-workflow/runs/route";
import { GET as getRun } from "@/app/api/content-workflow/runs/[id]/route";
import { GET as getRunStatus } from "@/app/api/content-workflow/runs/[id]/status/route";
import { POST as cancelRunRoute } from "@/app/api/content-workflow/runs/[id]/cancel/route";
import { POST as startRun } from "@/app/api/content-workflow/runs/[id]/start/route";
import { GET as getEvents } from "@/app/api/content-workflow/runs/[id]/events/route";
import { POST as retryRun } from "@/app/api/content-workflow/runs/[id]/retry/route";
import {
  cancelRun,
  createWorkflowRun,
  getWorkflowRun,
  getWorkflowSnapshot,
} from "@/lib/content-workflow-store";
import { listArtifactsByRun } from "@/lib/content-workflow-artifacts";
import {
  retryRunTarget,
  startRunOrchestration,
} from "@/lib/content-workflow-orchestrator";
import { listWorkflowEvents } from "@/lib/content-workflow-events";
import type {
  PillarResearchBranch,
  PillarResearchRun,
  PillarResearchStep,
} from "@/lib/content-workflow-types";

const mockedCreateWorkflowRun = vi.mocked(createWorkflowRun);
const mockedGetWorkflowSnapshot = vi.mocked(getWorkflowSnapshot);
const mockedCancelRun = vi.mocked(cancelRun);
const mockedGetWorkflowRun = vi.mocked(getWorkflowRun);
const mockedListArtifactsByRun = vi.mocked(listArtifactsByRun);
const mockedStartRunOrchestration = vi.mocked(startRunOrchestration);
const mockedRetryRunTarget = vi.mocked(retryRunTarget);
const mockedListWorkflowEvents = vi.mocked(listWorkflowEvents);

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
    mockedGetWorkflowRun.mockResolvedValue(snapshot.run);
    mockedListArtifactsByRun.mockResolvedValue([]);
    mockedStartRunOrchestration.mockResolvedValue({
      started: true,
      deduped: false,
      status: "branches_running",
    });
    mockedRetryRunTarget.mockResolvedValue({ accepted: true });
    mockedListWorkflowEvents.mockReturnValue([
      {
        id: "event-1",
        runId: "run-1",
        type: "run.started",
        timestamp: "2026-03-17T00:00:00.000Z",
        payload: { branchCount: 3 },
      },
    ]);
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

  it("starts orchestration", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/start",
      { method: "POST" }
    );
    const res = await startRun(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.status).toBe("branches_running");
  });

  it("returns event stream for run", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/events"
    );
    const res = await getEvents(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const body = await res.text();
    expect(body).toContain("event: run.started");
  });

  it("retries failed branch or step", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/retry",
      {
        method: "POST",
        body: JSON.stringify({ branchId: "branch-1" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const res = await retryRun(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.accepted).toBe(true);
  });
});

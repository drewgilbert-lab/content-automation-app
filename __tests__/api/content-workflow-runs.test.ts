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
  getRunDiagnostics: vi.fn(),
  listFailedRunsWithDiagnostics: vi.fn(),
}));

vi.mock("@/lib/content-workflow-assembler", () => ({
  getLatestFinalPillarPackage: vi.fn(),
}));

vi.mock("@/lib/content-workflow-events", () => ({
  listWorkflowEvents: vi.fn(),
}));

vi.mock("@/lib/content-workflow-telemetry", () => ({
  getWorkflowMetricsSnapshot: vi.fn(),
}));

import { POST as createRun } from "@/app/api/content-workflow/runs/route";
import { GET as getRun } from "@/app/api/content-workflow/runs/[id]/route";
import { GET as getRunStatus } from "@/app/api/content-workflow/runs/[id]/status/route";
import { POST as cancelRunRoute } from "@/app/api/content-workflow/runs/[id]/cancel/route";
import { POST as startRun } from "@/app/api/content-workflow/runs/[id]/start/route";
import { GET as getEvents } from "@/app/api/content-workflow/runs/[id]/events/route";
import { GET as getRunPackage } from "@/app/api/content-workflow/runs/[id]/package/route";
import { POST as retryRun } from "@/app/api/content-workflow/runs/[id]/retry/route";
import { GET as getRunDiagnosticsRoute } from "@/app/api/content-workflow/runs/[id]/diagnostics/route";
import { GET as getFailedRuns } from "@/app/api/content-workflow/runs/failed/route";
import { GET as getWorkflowMetrics } from "@/app/api/content-workflow/metrics/route";
import {
  cancelRun,
  createWorkflowRun,
  getWorkflowRun,
  getWorkflowSnapshot,
} from "@/lib/content-workflow-store";
import { listArtifactsByRun } from "@/lib/content-workflow-artifacts";
import {
  getRunDiagnostics,
  listFailedRunsWithDiagnostics,
  retryRunTarget,
  startRunOrchestration,
} from "@/lib/content-workflow-orchestrator";
import { getLatestFinalPillarPackage } from "@/lib/content-workflow-assembler";
import { listWorkflowEvents } from "@/lib/content-workflow-events";
import { getWorkflowMetricsSnapshot } from "@/lib/content-workflow-telemetry";
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
const mockedGetRunDiagnostics = vi.mocked(getRunDiagnostics);
const mockedListFailedRunsWithDiagnostics = vi.mocked(listFailedRunsWithDiagnostics);
const mockedGetLatestFinalPillarPackage = vi.mocked(getLatestFinalPillarPackage);
const mockedListWorkflowEvents = vi.mocked(listWorkflowEvents);
const mockedGetWorkflowMetricsSnapshot = vi.mocked(getWorkflowMetricsSnapshot);

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
    mockedGetRunDiagnostics.mockResolvedValue({
      run: snapshot.run,
      branches: snapshot.branches,
      steps: snapshot.steps,
      logs: [],
    });
    mockedListFailedRunsWithDiagnostics.mockResolvedValue([
      {
        runId: "run-1",
        startedAt: "2026-03-17T00:00:00.000Z",
        failedBranchCount: 1,
        failedStepCount: 1,
        errorSummary: "test",
      },
    ]);
    mockedGetLatestFinalPillarPackage.mockResolvedValue({
      id: "artifact-final-1",
      runId: "run-1",
      artifactType: "final_pillar_package",
      name: "pillar-research.final-pillar-package.run-1",
      version: 1,
      contentRef: "workflow://final-package/run-1/v1",
      contentType: "application/json",
      payload: {
        functionalityBriefRef: "workflow://brief/a",
        personaMessagingBriefRef: "workflow://brief/b",
        marketBriefRef: "workflow://brief/c",
        finalAggregationRef: "workflow://final-aggregation/run-1/v1",
      },
      lineage: { parentArtifactIds: [], producedByRunId: "run-1" },
      createdAt: "2026-03-17T00:00:00.000Z",
    });
    mockedListWorkflowEvents.mockReturnValue([
      {
        id: "event-1",
        runId: "run-1",
        type: "run.started",
        timestamp: "2026-03-17T00:00:00.000Z",
        payload: { branchCount: 3 },
      },
    ]);
    mockedGetWorkflowMetricsSnapshot.mockResolvedValue({
      activeRunsByStatus: { created: 1 },
      averageRunDurationMs: 1000,
      branchFailureRates: {},
      topFailingSteps: [],
      tokenUsageByBranch: {},
      failedRuns: 0,
      totalRuns: 1,
    });
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

  it("retries by step id when provided", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/retry",
      {
        method: "POST",
        body: JSON.stringify({ stepId: "step-123" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const res = await retryRun(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(202);
    expect(mockedRetryRunTarget).toHaveBeenCalledWith("run-1", {
      stepId: "step-123",
      branchId: undefined,
      replayFromStepId: undefined,
      reason: undefined,
      requestedBy: undefined,
    });
  });

  it("returns 400 when retry target is missing", async () => {
    mockedRetryRunTarget.mockRejectedValueOnce(
      new Error("Either stepId or branchId is required")
    );
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/retry",
      {
        method: "POST",
        body: JSON.stringify({ reason: "missing target" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const res = await retryRun(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Either stepId or branchId is required");
  });

  it("returns 404 when retry run is not found", async () => {
    mockedRetryRunTarget.mockRejectedValueOnce(new Error("Run not found"));
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-missing/retry",
      {
        method: "POST",
        body: JSON.stringify({ branchId: "branch-1" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const res = await retryRun(req, {
      params: Promise.resolve({ id: "run-missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("passes replay payload to retry route", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/retry",
      {
        method: "POST",
        body: JSON.stringify({
          branchId: "branch-1",
          replayFromStepId: "step-1",
          reason: "manual replay",
          requestedBy: "tester",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const res = await retryRun(req, {
      params: Promise.resolve({ id: "run-1" }),
    });
    expect(res.status).toBe(202);
    expect(mockedRetryRunTarget).toHaveBeenCalledWith("run-1", {
      branchId: "branch-1",
      stepId: undefined,
      replayFromStepId: "step-1",
      reason: "manual replay",
      requestedBy: "tester",
    });
  });

  it("returns final package for run", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/package"
    );
    const res = await getRunPackage(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.runId).toBe("run-1");
    expect(json.payload.marketBriefRef).toBe("workflow://brief/c");
  });

  it("returns 404 when final package is missing", async () => {
    mockedGetLatestFinalPillarPackage.mockResolvedValueOnce(null);
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/package"
    );
    const res = await getRunPackage(req, {
      params: Promise.resolve({ id: "run-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns run diagnostics", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/run-1/diagnostics"
    );
    const res = await getRunDiagnosticsRoute(req, {
      params: Promise.resolve({ id: "run-1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.run.id).toBe("run-1");
  });

  it("returns failed runs list", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/content-workflow/runs/failed"
    );
    const res = await getFailedRuns(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(1);
  });

  it("returns workflow metrics snapshot", async () => {
    const req = new NextRequest("http://localhost:3000/api/content-workflow/metrics");
    const res = await getWorkflowMetrics(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalRuns).toBe(1);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  classifyExecutionError,
  executeWithPolicy,
  runWithTimeout,
  type StepExecutionError,
} from "@/lib/content-workflow-executor";
import type { PillarResearchStep } from "@/lib/content-workflow-types";

const step: PillarResearchStep = {
  id: "step-1",
  runId: "run-1",
  branchId: "branch-1",
  stepType: "transcript_research",
  status: "pending",
  dependsOnStepIds: [],
  attempt: 0,
  maxRetries: 3,
  startedAt: "2026-03-17T00:00:00.000Z",
};

describe("content workflow executor", () => {
  it("classifies retryable and deterministic errors", () => {
    const retryable = new Error("rate limit exceeded");
    const deterministic = new Error("validation failed");
    expect(classifyExecutionError(retryable)).toBe("retryable");
    expect(classifyExecutionError(deterministic)).toBe("deterministic");
  });

  it("enforces timeout wrapper", async () => {
    await expect(
      runWithTimeout(5, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      })
    ).rejects.toThrow("timeout");
  });

  it("retries retryable failures and eventually succeeds", async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("network down"), { retryable: true }))
      .mockRejectedValueOnce(Object.assign(new Error("rate limit"), { retryable: true }))
      .mockResolvedValueOnce(undefined);

    const result = await executeWithPolicy(
      {
        runId: "run-1",
        branchId: "branch-1",
        step,
      },
      {
        timeoutMs: 500,
        maxRetries: 3,
        baseDelayMs: 1,
      },
      execute
    );

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("fails fast on deterministic errors", async () => {
    const deterministicError: StepExecutionError = Object.assign(
      new Error("schema validation failure"),
      { retryable: false }
    );
    const execute = vi.fn().mockRejectedValue(deterministicError);

    const result = await executeWithPolicy(
      {
        runId: "run-1",
        branchId: "branch-1",
        step,
      },
      {
        timeoutMs: 500,
        maxRetries: 3,
        baseDelayMs: 1,
      },
      execute
    );

    expect(result.success).toBe(false);
    expect(result.errorClass).toBe("deterministic");
    expect(result.attempts).toBe(1);
  });
});

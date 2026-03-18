import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  enforceArtifactOutputBudget,
  enforceTextBudget,
  estimateTokenCount,
  resolveStepTokenBudget,
} from "@/lib/content-workflow-budget";
import type { PillarResearchArtifact } from "@/lib/content-workflow-types";

describe("content workflow budget", () => {
  it("estimates token count from text length", () => {
    expect(estimateTokenCount("")).toBe(0);
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("a".repeat(9))).toBe(3);
  });

  it("truncates text when policy is truncate", () => {
    const longText = "a".repeat(200);
    const result = enforceTextBudget(longText, 10, "truncate");
    expect(result.adjusted).toBe(true);
    expect(result.tokenCount).toBeLessThanOrEqual(10);
  });

  it("throws for fail policy when over budget", () => {
    expect(() => enforceTextBudget("a".repeat(120), 5, "fail")).toThrow(BudgetExceededError);
  });

  it("enforces artifact output budget and writes metadata", () => {
    const artifact: PillarResearchArtifact<"competitor_functionality_doc"> = {
      id: "artifact-1",
      runId: "run-1",
      branchId: "branch-1",
      stepId: "step-1",
      artifactType: "competitor_functionality_doc",
      name: "doc-1",
      version: 1,
      contentRef: "workflow://doc-1",
      contentType: "text/markdown",
      payload: { markdown: "x".repeat(15000) },
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-1",
      },
      createdAt: new Date().toISOString(),
    };

    const result = enforceArtifactOutputBudget(artifact);
    expect(result.adjusted).toBe(true);
    expect(result.artifact.metadata?.outputAdjusted).toBe(true);
    expect(Number(result.artifact.metadata?.outputTokens)).toBeLessThanOrEqual(2000);
  });

  it("returns default step budget", () => {
    const budget = resolveStepTokenBudget("unknown_step");
    expect(budget.maxInputTokens).toBeGreaterThan(0);
    expect(budget.maxOutputTokens).toBeGreaterThan(0);
  });
});
